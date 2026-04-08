import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, action, fileContent, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If this is a student document upload, parse and insert
    if (action === "parse_students" && fileContent) {
      return await handleStudentImport(fileContent, fileName, context, LOVABLE_API_KEY, supabase);
    }

    // Fetch live system data for context
    let systemData = "";
    try {
      const [studentsRes, incidentsRes, classesRes, permissionsRes] = await Promise.all([
        supabase.from("students").select("id, name, student_id, total_marks, status, gender", { count: "exact" }).limit(0),
        supabase.from("incidents").select("id, severity, status", { count: "exact" }).limit(0),
        supabase.from("classes").select("id, name, grade_level", { count: "exact" }),
        supabase.from("permissions").select("id, status", { count: "exact" }).eq("status", "active").limit(0),
      ]);
      
      const pendingIncidents = await supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "pending");
      const approvedIncidents = await supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "approved");

      systemData = `
LIVE SYSTEM DATA:
- Total students: ${studentsRes.count || 0}
- Total incidents: ${incidentsRes.count || 0} (Pending: ${pendingIncidents.count || 0}, Approved: ${approvedIncidents.count || 0})
- Active permissions: ${permissionsRes.count || 0}
- Classes: ${classesRes.data?.map(c => `${c.name} (${c.grade_level || 'N/A'})`).join(", ") || "None"}
`;

      // Get recent incidents for context
      const { data: recentIncidents } = await supabase
        .from("incidents")
        .select("description, severity, status, created_at, students(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (recentIncidents?.length) {
        systemData += "\nRecent incidents:\n";
        recentIncidents.forEach((inc: any) => {
          systemData += `- ${inc.students?.name || "Unknown"}: ${inc.description?.slice(0, 60)} (${inc.severity}, ${inc.status})\n`;
        });
      }

      // Get students with low marks
      const { data: lowMarkStudents } = await supabase
        .from("students")
        .select("name, student_id, total_marks")
        .lt("total_marks", 70)
        .order("total_marks", { ascending: true })
        .limit(5);
      
      if (lowMarkStudents?.length) {
        systemData += "\nStudents with low marks (below 70):\n";
        lowMarkStudents.forEach((s: any) => {
          systemData += `- ${s.name} (${s.student_id}): ${s.total_marks} marks\n`;
        });
      }
    } catch (e) {
      console.error("Failed to fetch system data:", e);
    }

    const systemPrompt = `You are SDMS Assistant, a powerful AI helper for the School Discipline Management System at Ecole des Sciences Byimana. You have FULL ACCESS to the system data and can help staff with:

- Viewing real-time statistics (students, incidents, classes, permissions)
- Answering questions about student records and behavior
- Providing guidance on discipline policies and procedures
- Helping draft incident descriptions
- Explaining student marks and deduction rules
- Identifying at-risk students (low marks, repeat offenders)
- Understanding how to use every feature of the system
- Providing data-driven insights and recommendations

${systemData}

Current user context: ${context || "No context provided"}

CAPABILITIES:
- You have access to live system data shown above
- You can see recent incidents, student marks, and class information
- You can provide specific, data-backed answers about the school's discipline status
- When users upload student documents, you help parse and confirm the data

RULES:
- Keep responses concise and actionable
- Use the real data provided to give specific answers
- When asked about stats, reference the actual numbers
- If asked to do something beyond your capabilities, explain what they should do in the system UI
- Be professional and supportive`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
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

async function handleStudentImport(
  fileContent: string,
  fileName: string,
  context: string,
  apiKey: string,
  supabase: any
) {
  // Use AI to parse the document into structured student data
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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
  
  // Clean the response
  let jsonStr = rawContent.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  let students: any[];
  try {
    students = JSON.parse(jsonStr);
  } catch {
    // Generate a streaming response explaining the error
    const errorMsg = `I couldn't parse the document "${fileName}" into student records. Please make sure it contains columns like: name, student_id, gender, date_of_birth.\n\nSupported formats:\n- CSV with headers\n- Tab-separated text\n- JSON array`;
    return streamText(errorMsg);
  }

  if (!Array.isArray(students) || students.length === 0) {
    return streamText(`No student records found in "${fileName}". Please ensure the document contains student data with at least: name, student_id, gender, and date_of_birth.`);
  }

  // Get existing classes to assign
  const { data: classes } = await supabase.from("classes").select("id, name").limit(1);
  const defaultClassId = classes?.[0]?.id || null;

  // Insert students
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const s of students) {
    if (!s.name || !s.student_id || !s.gender || !s.date_of_birth) {
      results.failed++;
      results.errors.push(`Missing required fields for: ${s.name || s.student_id || "unknown"}`);
      continue;
    }

    // Normalize gender
    const gender = s.gender.charAt(0).toUpperCase() + s.gender.slice(1).toLowerCase();
    if (!["Male", "Female", "Other"].includes(gender)) {
      results.failed++;
      results.errors.push(`Invalid gender "${s.gender}" for ${s.name}`);
      continue;
    }

    const { error } = await supabase.from("students").insert({
      name: s.name,
      student_id: s.student_id,
      gender,
      date_of_birth: s.date_of_birth,
      parent_name: s.parent_name || null,
      parent_phone: s.parent_phone || null,
      class_id: defaultClassId,
      total_marks: 100,
      status: "active",
    });

    if (error) {
      results.failed++;
      results.errors.push(`${s.name}: ${error.message}`);
    } else {
      results.success++;
    }
  }

  let responseMsg = `📄 **Document Import Results**\n\nFile: ${fileName}\nTotal records found: ${students.length}\n✅ Successfully added: ${results.success}\n❌ Failed: ${results.failed}`;
  
  if (results.errors.length > 0) {
    responseMsg += `\n\n**Errors:**\n${results.errors.slice(0, 10).map(e => `- ${e}`).join("\n")}`;
    if (results.errors.length > 10) responseMsg += `\n... and ${results.errors.length - 10} more errors`;
  }

  if (results.success > 0) {
    responseMsg += `\n\n✨ ${results.success} students have been added to the system. You can view them in the Student Information System (SIS).`;
  }

  return streamText(responseMsg);
}

function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const chunks = text.match(/.{1,20}/g) || [text];
  
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk, i) => {
        const data = JSON.stringify({
          choices: [{ delta: { content: chunk } }],
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
    },
  });
}
