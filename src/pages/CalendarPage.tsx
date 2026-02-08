import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  banner_url: string | null;
  created_by: string;
}

const CalendarPage = () => {
  const { user, hasRole } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", event_time: "", banner_url: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ title: "", description: "", event_date: "", event_time: "", banner_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (e: Event) => {
    setEditingEvent(e);
    setForm({ title: e.title, description: e.description || "", event_date: e.event_date, event_time: e.event_time || "", banner_url: e.banner_url || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.event_date || !user) { toast.error("Title and date are required"); return; }
    setIsSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      banner_url: form.banner_url || null,
      created_by: user.id,
    };

    if (editingEvent) {
      const { error } = await supabase.from("events").update(payload).eq("id", editingEvent.id);
      if (error) toast.error("Failed to update event");
      else { toast.success("Event updated"); setDialogOpen(false); fetchEvents(); }
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) toast.error("Failed to create event");
      else { toast.success("Event created"); setDialogOpen(false); fetchEvents(); }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Event deleted"); fetchEvents(); }
  };

  const isPast = (date: string) => new Date(date) < new Date(new Date().toDateString());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Calendar className="w-8 h-8" /> Event Calendar</h1>
            <p className="text-muted-foreground">View and manage school events</p>
          </div>
          {hasRole("principal") && (
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Event</Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading events...</p>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">No Events</h3><p className="text-muted-foreground">No upcoming events scheduled.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map(ev => (
              <Card key={ev.id} className={`overflow-hidden ${isPast(ev.event_date) ? "opacity-60" : ""}`}>
                {ev.banner_url && <img src={ev.banner_url} alt={ev.title} className="w-full h-40 object-cover" />}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{ev.title}</CardTitle>
                    {isPast(ev.event_date) && <Badge variant="secondary">Past</Badge>}
                  </div>
                  <CardDescription>
                    {new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    {ev.event_time && ` · ${ev.event_time}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ev.description && <p className="text-sm text-muted-foreground mb-3">{ev.description}</p>}
                  {hasRole("principal") && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(ev)} className="gap-1"><Edit className="w-3 h-3" /> Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(ev.id)} className="gap-1 text-destructive"><Trash2 className="w-3 h-3" /> Delete</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date *</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} /></div>
                <div><Label>Time</Label><Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} /></div>
              </div>
              <div><Label>Banner Image URL</Label><Input value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} placeholder="https://..." /></div>
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />} {editingEvent ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CalendarPage;
