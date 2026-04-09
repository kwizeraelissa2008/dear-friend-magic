import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, action, fileContent, fileName, fileType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle specific actions
    if (action === "parse_students" && fileContent) {
      return await handleStudentImport(fileContent, fileName, LOVABLE_API_KEY, supabase);
    }
    if (action === "process_document" && fileContent) {
      return await handleDocumentProcess(fileContent, fileName, fileType, context, messages, LOVABLE_API_KEY, supabase);
    }
    if (action === "execute_action") {
      return await handleExecuteAction(messages, context, LOVABLE_API_KEY, supabase);
    }

    // Fetch live system data for context
    const systemData = await fetchSystemData(supabase);
    const systemPrompt = buildSystemPrompt(systemData, context);

    // Check if the latest user message requests a data modification
    const lastMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || "";
    const isActionRequest = detectActionIntent(lastMsg);

    if (isActionRequest) {
      return await handleExecuteAction(messages, context, LOVABLE_API_KEY, supabase);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) return handleAIError(response);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function detectActionIntent(msg: string): boolean {
  const actionKeywords = [
    "add student", "create student", "register student", "enroll student",
    "delete student", "remove student",
    "update student", "edit student", "change student", "modify student",
    "add class", "create class", "delete class", "remove class", "update class",
    "create incident", "report incident", "add incident", "log incident",
    "approve incident", "reject incident",
    "grant permission", "create permission", "add permission",
    "revoke permission", "expire permission",
    "create event", "add event", "schedule event", "delete event",
    "update marks", "deduct marks", "restore marks", "set marks",
    "add notification", "send notification", "notify",
  ];
  return actionKeywords.some(kw => msg.includes(kw));
}

async function handleExecuteAction(
  messages: any[],
  context: string,
  apiKey: string,
  supabase: any
): Promise<Response> {
  const systemData = await fetchSystemData(supabase);

  // Get class list for context
  const { data: classes } = await supabase.from("classes").select("id, name, grade_level");
  const classInfo = classes?.map((c: any) => `${c.name} (id: ${c.id}, grade: ${c.grade_level || 'N/A'})`).join(", ") || "None";

  const actionPrompt = `You are an AI that executes database actions for the SDMS. Based on the conversation, determine the EXACT action to perform and return a JSON object.

AVAILABLE ACTIONS:
1. insert_student - Add a new student
2. update_student - Update student fields  
3. delete_student - Remove a student
4. insert_class - Create a new class
5. update_class - Update class fields
6. delete_class - Remove a class
7. insert_incident - Report an incident
8. update_incident - Update incident (approve/reject/modify)
9. insert_permission - Grant a permission
10. update_permission - Update permission status
11. insert_event - Create an event
12. update_event - Update event details
13. delete_event - Remove an event
14. update_marks - Update student marks
15. insert_notification - Send a notification
16. bulk_insert_students - Add multiple students

CURRENT SYSTEM DATA:
${systemData}
Available classes: ${classInfo}

Current context: ${context}

RULES:
- Return ONLY valid JSON with the structure: { "action": "action_name", "data": {...}, "description": "what you did" }
- For bulk_insert_students, data should be { "students": [...] }
- For updates, include { "id": "uuid", "updates": {...} }
- For deletes, include { "id": "uuid" } or { "identifier": "student_id_value" }
- Use real class IDs from the list above
- Gender must be "Male", "Female", or "Other"
- date_of_birth format: YYYY-MM-DD
- severity must be: minor, moderate, serious, severe, critical
- status for incidents: pending, approved, rejected
- If you cannot determine the action, return { "action": "none", "message": "explain what info is missing" }
- NEVER make up UUIDs for existing records. If you need to find a record, return a search action first.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: actionPrompt },
        ...messages.slice(-5),
      ],
    }),
  });

  if (!response.ok) return handleAIError(response);

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content || "";

  let jsonStr = rawContent.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  let actionPlan: any;
  try {
    actionPlan = JSON.parse(jsonStr);
  } catch {
    return streamText(`I understood your request but couldn't determine the exact action. Could you please be more specific? For example:\n- "Add student John Doe, ID: S001, Male, born 2008-05-15 to Senior 1A"\n- "Create a new class Senior 2B, grade S2"\n- "Report minor incident for student S001: late to class"`);
  }

  if (actionPlan.action === "none") {
    return streamText(actionPlan.message || "I need more information to complete this action. Please provide specific details.");
  }

  // Execute the action
  const execResult = await executeAction(actionPlan, supabase);
  return streamText(execResult);
}

async function executeAction(plan: any, supabase: any): Promise<string> {
  const { action, data } = plan;

  try {
    switch (action) {
      case "insert_student": {
        const { error } = await supabase.from("students").insert({
          name: data.name,
          student_id: data.student_id,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          class_id: data.class_id || null,
          parent_name: data.parent_name || null,
          parent_phone: data.parent_phone || null,
          total_marks: data.total_marks ?? 100,
          status: "active",
        });
        if (error) return `❌ Failed to add student: ${error.message}`;
        return `✅ **Student added successfully!**\n- Name: ${data.name}\n- ID: ${data.student_id}\n- Gender: ${data.gender}\n- DOB: ${data.date_of_birth}${data.class_id ? `\n- Class assigned` : ""}`;
      }

      case "bulk_insert_students": {
        const students = data.students || [];
        if (!students.length) return "❌ No students provided for bulk insert.";
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const s of students) {
          const { error } = await supabase.from("students").insert({
            name: s.name, student_id: s.student_id, gender: s.gender,
            date_of_birth: s.date_of_birth, class_id: s.class_id || null,
            parent_name: s.parent_name || null, parent_phone: s.parent_phone || null,
            total_marks: s.total_marks ?? 100, status: "active",
          });
          if (error) { failed++; errors.push(`${s.name}: ${error.message}`); } else { success++; }
        }
        let msg = `📊 **Bulk Import Results**\n✅ Added: ${success}\n❌ Failed: ${failed}`;
        if (errors.length) msg += `\n\n**Errors:**\n${errors.slice(0, 5).map(e => `- ${e}`).join("\n")}`;
        return msg;
      }

      case "update_student": {
        let studentId = data.id;
        if (!studentId && data.identifier) {
          const { data: found } = await supabase.from("students").select("id").eq("student_id", data.identifier).single();
          studentId = found?.id;
        }
        if (!studentId) return "❌ Could not find the student. Please provide a valid student ID.";
        const { error } = await supabase.from("students").update(data.updates).eq("id", studentId);
        if (error) return `❌ Failed to update student: ${error.message}`;
        return `✅ **Student updated successfully!**\n${Object.entries(data.updates).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
      }

      case "delete_student": {
        let studentId = data.id;
        if (!studentId && data.identifier) {
          const { data: found } = await supabase.from("students").select("id, name").eq("student_id", data.identifier).single();
          studentId = found?.id;
          if (!studentId) return `❌ No student found with ID "${data.identifier}".`;
        }
        if (!studentId) return "❌ Please specify which student to delete.";
        const { error } = await supabase.from("students").delete().eq("id", studentId);
        if (error) return `❌ Failed to delete student: ${error.message}`;
        return `✅ **Student deleted successfully.**`;
      }

      case "insert_class": {
        const { error } = await supabase.from("classes").insert({
          name: data.name, grade_level: data.grade_level || null, stream: data.stream || null,
        });
        if (error) return `❌ Failed to create class: ${error.message}`;
        return `✅ **Class "${data.name}" created successfully!**${data.grade_level ? `\n- Grade: ${data.grade_level}` : ""}`;
      }

      case "update_class": {
        if (!data.id) return "❌ Class ID is required for updates.";
        const { error } = await supabase.from("classes").update(data.updates).eq("id", data.id);
        if (error) return `❌ Failed to update class: ${error.message}`;
        return `✅ **Class updated successfully!**`;
      }

      case "delete_class": {
        if (!data.id) return "❌ Class ID is required for deletion.";
        const { error } = await supabase.from("classes").delete().eq("id", data.id);
        if (error) return `❌ Failed to delete class: ${error.message}`;
        return `✅ **Class deleted successfully.**`;
      }

      case "insert_incident": {
        let studentId = data.student_id;
        if (!studentId && data.student_identifier) {
          const { data: found } = await supabase.from("students").select("id").eq("student_id", data.student_identifier).single();
          studentId = found?.id;
        }
        if (!studentId) return "❌ Could not find the student. Provide a valid student ID.";
        const { error } = await supabase.from("incidents").insert({
          student_id: studentId,
          reporter_id: data.reporter_id || "00000000-0000-0000-0000-000000000000",
          description: data.description,
          severity: data.severity || "minor",
          status: "pending",
          location: data.location || null,
          marks_deducted: data.marks_deducted || 0,
          deduction_reason: data.deduction_reason || null,
        });
        if (error) return `❌ Failed to create incident: ${error.message}`;
        return `✅ **Incident reported successfully!**\n- Severity: ${data.severity || "minor"}\n- Description: ${data.description}\n- Status: Pending approval`;
      }

      case "update_incident": {
        if (!data.id) return "❌ Incident ID is required.";
        const { error } = await supabase.from("incidents").update(data.updates).eq("id", data.id);
        if (error) return `❌ Failed to update incident: ${error.message}`;
        return `✅ **Incident updated.** ${data.updates.status ? `Status: ${data.updates.status}` : ""}`;
      }

      case "insert_permission": {
        let studentId = data.student_id;
        if (!studentId && data.student_identifier) {
          const { data: found } = await supabase.from("students").select("id").eq("student_id", data.student_identifier).single();
          studentId = found?.id;
        }
        if (!studentId) return "❌ Could not find the student.";
        const { error } = await supabase.from("permissions").insert({
          student_id: studentId,
          granted_by: data.granted_by || "00000000-0000-0000-0000-000000000000",
          title: data.title,
          description: data.description,
          expires_at: data.expires_at,
          status: "active",
        });
        if (error) return `❌ Failed to grant permission: ${error.message}`;
        return `✅ **Permission granted!**\n- Title: ${data.title}\n- Expires: ${data.expires_at}`;
      }

      case "update_permission": {
        if (!data.id) return "❌ Permission ID is required.";
        const { error } = await supabase.from("permissions").update(data.updates).eq("id", data.id);
        if (error) return `❌ Failed to update permission: ${error.message}`;
        return `✅ **Permission updated.**`;
      }

      case "insert_event": {
        const { error } = await supabase.from("events").insert({
          title: data.title,
          description: data.description || null,
          event_date: data.event_date,
          event_time: data.event_time || null,
          created_by: data.created_by || "00000000-0000-0000-0000-000000000000",
        });
        if (error) return `❌ Failed to create event: ${error.message}`;
        return `✅ **Event "${data.title}" created!**\n- Date: ${data.event_date}`;
      }

      case "update_event": {
        if (!data.id) return "❌ Event ID is required.";
        const { error } = await supabase.from("events").update(data.updates).eq("id", data.id);
        if (error) return `❌ Failed to update event: ${error.message}`;
        return `✅ **Event updated.**`;
      }

      case "delete_event": {
        if (!data.id) return "❌ Event ID is required.";
        const { error } = await supabase.from("events").delete().eq("id", data.id);
        if (error) return `❌ Failed to delete event: ${error.message}`;
        return `✅ **Event deleted.**`;
      }

      case "update_marks": {
        let studentId = data.id;
        if (!studentId && data.identifier) {
          const { data: found } = await supabase.from("students").select("id, total_marks").eq("student_id", data.identifier).single();
          studentId = found?.id;
        }
        if (!studentId) return "❌ Student not found.";
        const updates: any = {};
        if (data.total_marks !== undefined) updates.total_marks = data.total_marks;
        if (data.deduct) {
          const { data: student } = await supabase.from("students").select("total_marks").eq("id", studentId).single();
          updates.total_marks = Math.max(0, (student?.total_marks || 100) - data.deduct);
        }
        if (data.restore) {
          const { data: student } = await supabase.from("students").select("total_marks").eq("id", studentId).single();
          updates.total_marks = Math.min(100, (student?.total_marks || 0) + data.restore);
        }
        const { error } = await supabase.from("students").update(updates).eq("id", studentId);
        if (error) return `❌ Failed to update marks: ${error.message}`;
        return `✅ **Marks updated.** New total: ${updates.total_marks}`;
      }

      case "insert_notification": {
        const { error } = await supabase.from("notifications").insert({
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type || "info",
        });
        if (error) return `❌ Failed to send notification: ${error.message}`;
        return `✅ **Notification sent!**`;
      }

      default:
        return `❓ Unknown action: ${action}. Please try rephrasing your request.`;
    }
  } catch (e: any) {
    console.error("Action execution error:", e);
    return `❌ Error executing action: ${e.message}`;
  }
}

async function fetchSystemData(supabase: any): Promise<string> {
  try {
    const [studentsRes, incidentsRes, classesRes, permissionsRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact" }).limit(0),
      supabase.from("incidents").select("id", { count: "exact" }).limit(0),
      supabase.from("classes").select("id, name, grade_level"),
      supabase.from("permissions").select("id", { count: "exact" }).eq("status", "active").limit(0),
    ]);

    const [pendingInc, approvedInc, recentIncidents, lowMarkStudents] = await Promise.all([
      supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("incidents").select("description, severity, status, created_at, students(name)").order("created_at", { ascending: false }).limit(5),
      supabase.from("students").select("name, student_id, total_marks").lt("total_marks", 70).order("total_marks", { ascending: true }).limit(5),
    ]);

    let data = `
LIVE SYSTEM DATA:
- Total students: ${studentsRes.count || 0}
- Total incidents: ${incidentsRes.count || 0} (Pending: ${pendingInc.count || 0}, Approved: ${approvedInc.count || 0})
- Active permissions: ${permissionsRes.count || 0}
- Classes: ${classesRes.data?.map((c: any) => `${c.name} (${c.grade_level || 'N/A'})`).join(", ") || "None"}`;

    if (recentIncidents.data?.length) {
      data += "\nRecent incidents:\n";
      recentIncidents.data.forEach((inc: any) => {
        data += `- ${inc.students?.name || "Unknown"}: ${inc.description?.slice(0, 60)} (${inc.severity}, ${inc.status})\n`;
      });
    }

    if (lowMarkStudents.data?.length) {
      data += "\nStudents with low marks (below 70):\n";
      lowMarkStudents.data.forEach((s: any) => {
        data += `- ${s.name} (${s.student_id}): ${s.total_marks} marks\n`;
      });
    }

    return data;
  } catch (e) {
    console.error("Failed to fetch system data:", e);
    return "";
  }
}

function buildSystemPrompt(systemData: string, context: string): string {
  return `You are SDMS Assistant, a powerful AI helper for the School Discipline Management System at Ecole des Sciences Byimana. You have FULL READ AND WRITE ACCESS to the system and can help staff with:

- Viewing and modifying real-time data (students, incidents, classes, permissions, events)
- Adding, updating, and deleting students directly
- Creating and managing classes
- Reporting and approving/rejecting incidents
- Granting and revoking permissions
- Creating and managing events
- Updating student marks (deductions and restorations)
- Sending notifications to users
- Processing uploaded documents and importing data
- Providing data-driven insights and recommendations

${systemData}

Current user context: ${context}

ACTION CAPABILITIES:
You can directly modify the system. When users ask you to add, update, delete, or modify any data, DO IT directly.
Examples of what you can do:
- "Add student John Doe, ID S001, Male, born 2008-05-15" → adds the student
- "Delete student S003" → removes them
- "Create class Senior 3A, grade S3" → creates the class
- "Report minor incident for S001: late to class" → creates the incident
- "Deduct 5 marks from S001 for misconduct" → updates marks
- "Grant permission for S001: medical leave until 2026-04-20" → creates permission
- "Schedule event: Sports Day on 2026-05-01" → creates event

RULES:
- Keep responses concise and actionable
- Use the real data provided to give specific answers
- When asked about stats, reference the actual numbers
- Be professional and supportive
- Execute modification requests directly - don't just explain how to do it in the UI
- After performing an action, confirm what was done
- Never hallucinate data
- Clearly separate extracted vs inferred data`;
}

async function handleDocumentProcess(
  fileContent: string, fileName: string, fileType: string,
  context: string, messages: any[], apiKey: string, supabase: any
): Promise<Response> {
  const analysisPrompt = `Analyze this uploaded document and provide structured insights for the School Discipline Management System.

File: "${fileName}" (type: ${fileType})

Content:
${fileContent.slice(0, 20000)}

Instructions:
1. Identify the document type (student list, incident report, grade sheet, event schedule, etc.)
2. Extract all structured data you can find
3. Map data to SDMS entities: students, incidents, classes, events, permissions
4. Highlight any anomalies (duplicates, missing fields, invalid data)
5. Suggest specific actions the user can take
6. If this contains student data that can be imported, offer to do so

Format your response clearly with sections:
📄 **Document Analysis**
📊 **Extracted Data** 
⚠️ **Issues Found** (if any)
🎯 **Suggested Actions**

If this is a student list, ask the user if they want you to import the students automatically.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a document analysis AI for a School Discipline Management System. Analyze documents thoroughly and provide actionable insights." },
        ...messages.slice(-3),
        { role: "user", content: analysisPrompt },
      ],
      stream: true,
    }),
  });

  if (!response.ok) return handleAIError(response);
  return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

async function handleStudentImport(
  fileContent: string, fileName: string, apiKey: string, supabase: any
): Promise<Response> {
  const parsePrompt = `Parse this student data from file "${fileName}" into a JSON array. Each student should have these fields:
- name (required, string)
- student_id (required, string - admission number)
- gender (required, must be exactly "Male", "Female", or "Other")
- date_of_birth (required, format: YYYY-MM-DD)
- parent_name (optional, string)
- parent_phone (optional, string)

Return ONLY a valid JSON array, no markdown, no explanation. If you can't parse the data, return an empty array [].

Document content:
${fileContent.slice(0, 15000)}`;

  const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a data parser. Extract student information and return ONLY valid JSON arrays. No markdown formatting." },
        { role: "user", content: parsePrompt },
      ],
    }),
  });

  if (!parseResponse.ok) {
    return new Response(JSON.stringify({ error: "Failed to parse document" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parseResult = await parseResponse.json();
  const rawContent = parseResult.choices?.[0]?.message?.content || "[]";

  let jsonStr = rawContent.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  let students: any[];
  try {
    students = JSON.parse(jsonStr);
  } catch {
    return streamText(`I couldn't parse "${fileName}" into student records. Please ensure it has columns like: name, student_id, gender, date_of_birth.`);
  }

  if (!Array.isArray(students) || students.length === 0) {
    return streamText(`No student records found in "${fileName}".`);
  }

  const { data: classes } = await supabase.from("classes").select("id, name").limit(1);
  const defaultClassId = classes?.[0]?.id || null;

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const s of students) {
    if (!s.name || !s.student_id || !s.gender || !s.date_of_birth) {
      results.failed++;
      results.errors.push(`Missing required fields for: ${s.name || s.student_id || "unknown"}`);
      continue;
    }
    const gender = s.gender.charAt(0).toUpperCase() + s.gender.slice(1).toLowerCase();
    if (!["Male", "Female", "Other"].includes(gender)) {
      results.failed++;
      results.errors.push(`Invalid gender "${s.gender}" for ${s.name}`);
      continue;
    }
    const { error } = await supabase.from("students").insert({
      name: s.name, student_id: s.student_id, gender,
      date_of_birth: s.date_of_birth, parent_name: s.parent_name || null,
      parent_phone: s.parent_phone || null, class_id: defaultClassId,
      total_marks: 100, status: "active",
    });
    if (error) { results.failed++; results.errors.push(`${s.name}: ${error.message}`); }
    else { results.success++; }
  }

  let responseMsg = `📄 **Import Results**\n\nFile: ${fileName}\nTotal: ${students.length}\n✅ Added: ${results.success}\n❌ Failed: ${results.failed}`;
  if (results.errors.length > 0) {
    responseMsg += `\n\n**Errors:**\n${results.errors.slice(0, 10).map(e => `- ${e}`).join("\n")}`;
  }
  if (results.success > 0) {
    responseMsg += `\n\n✨ ${results.success} students added! View them in SIS.`;
  }
  return streamText(responseMsg);
}

async function handleAIError(response: Response): Promise<Response> {
  if (response.status === 429) {
    return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (response.status === 402) {
    return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const t = await response.text();
  console.error("AI gateway error:", response.status, t);
  return new Response(JSON.stringify({ error: "AI service error" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const chunks = text.match(/.{1,20}/g) || [text];
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => {
        const data = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
