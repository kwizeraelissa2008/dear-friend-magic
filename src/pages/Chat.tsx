import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send, Plus, Users, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Conversation {
  id: string;
  type: string;
  name: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const Chat = () => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newChatDialog, setNewChatDialog] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profilesMap, setProfilesMap] = useState<Map<string, { full_name: string; role?: string }>>(new Map());

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchProfilesMap();
    }
  }, [user]);

  useEffect(() => {
    if (activeConv) fetchMessages(activeConv);
  }, [activeConv]);

  // Realtime messages
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages-${activeConv}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConv}`,
      }, (payload) => {
        const msg = payload.new as Message;
        const p = profilesMap.get(msg.sender_id);
        msg.sender_name = p?.full_name || "Unknown";
        msg.sender_role = p?.role;
        setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv, profilesMap]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProfilesMap = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
    const map = new Map<string, { full_name: string; role?: string }>();
    profiles?.forEach(p => {
      map.set(p.id, { full_name: p.full_name, role: roleMap.get(p.id) });
    });
    setProfilesMap(map);
  };

  const fetchConversations = async () => {
    setIsLoading(true);
    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user!.id);

    if (memberRows && memberRows.length > 0) {
      const convIds = memberRows.map(m => m.conversation_id);
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      // For private conversations, resolve the other user's name
      if (convs) {
        const enriched = await Promise.all(convs.map(async (c) => {
          if (c.type === "private" && !c.name) {
            const { data: members } = await supabase
              .from("conversation_members")
              .select("user_id")
              .eq("conversation_id", c.id);
            const otherId = members?.find(m => m.user_id !== user!.id)?.user_id;
            if (otherId) {
              const { data: otherProfile } = await supabase.from("profiles").select("full_name").eq("id", otherId).single();
              return { ...c, name: otherProfile?.full_name || "Private Chat" };
            }
          }
          return c;
        }));
        setConversations(enriched);
        if (!activeConv && enriched.length > 0) setActiveConv(enriched[0].id);
      }
    }
    setIsLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200);

    const enriched = (data || []).map(m => {
      const p = profilesMap.get(m.sender_id);
      return { ...m, sender_name: p?.full_name || "Unknown", sender_role: p?.role };
    });
    setMessages(enriched);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv || !user) return;
    setIsSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConv,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
    setIsSending(false);
  };

  const startPrivateChat = async (otherUser: UserProfile) => {
    if (!user) return;
    // Check if conversation already exists
    const { data: myConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    const { data: theirConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUser.id);

    const myIds = new Set(myConvs?.map(c => c.conversation_id) || []);
    const common = theirConvs?.filter(c => myIds.has(c.conversation_id)).map(c => c.conversation_id) || [];

    // Check if any common conversation is private
    for (const cid of common) {
      const { data: conv } = await supabase.from("conversations").select("type").eq("id", cid).single();
      if (conv?.type === "private") {
        setActiveConv(cid);
        setNewChatDialog(false);
        return;
      }
    }

    // Create new private conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ type: "private", name: null, created_by: user.id })
      .select()
      .single();

    if (error || !newConv) {
      toast.error("Failed to create conversation");
      return;
    }

    await supabase.from("conversation_members").insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: otherUser.id },
    ]);

    setNewChatDialog(false);
    fetchConversations();
    setActiveConv(newConv.id);
  };

  const loadAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("status", "approved")
      .neq("id", user!.id);
    setAllUsers(data || []);
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const formatRole = (role?: string) => role ? role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

  const activeConvData = conversations.find(c => c.id === activeConv);
  const filteredUsers = allUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Conversation List */}
        <Card className="w-80 shrink-0 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Chats
            </CardTitle>
            <Dialog open={newChatDialog} onOpenChange={(open) => { setNewChatDialog(open); if (open) loadAllUsers(); }}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost"><Plus className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Start Private Chat</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Search users..." value={searchUser} onChange={e => setSearchUser(e.target.value)} />
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                      ) : filteredUsers.map(u => (
                        <Button key={u.id} variant="ghost" className="w-full justify-start gap-3" onClick={() => startPrivateChat(u)}>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-sm font-medium">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex-1 p-2 overflow-auto">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {conversations.map(c => (
                  <Button
                    key={c.id}
                    variant={activeConv === c.id ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 h-auto py-3"
                    onClick={() => setActiveConv(c.id)}
                  >
                    {c.type === "group" ? <Users className="w-4 h-4 shrink-0" /> : <User className="w-4 h-4 shrink-0" />}
                    <span className="truncate text-left">{c.name || "Private Chat"}</span>
                    {c.type === "group" && <Badge variant="outline" className="ml-auto text-xs shrink-0">Group</Badge>}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Area */}
        <Card className="flex-1 flex flex-col">
          {activeConv ? (
            <>
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg">
                  {activeConvData?.name || "Chat"}
                  {activeConvData?.type === "group" && (
                    <Badge variant="outline" className="ml-2 text-xs">Group</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-12">No messages yet. Start the conversation!</p>
                  ) : messages.map(m => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3 space-y-1`}>
                          {!isMe && (
                            <p className="text-xs font-semibold">
                              {m.sender_name}
                              {m.sender_role && <span className="font-normal opacity-70"> ({formatRole(m.sender_role)})</span>}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          <p className={`text-xs ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <Button onClick={handleSend} disabled={isSending || !newMessage.trim()} size="icon">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Select a conversation</h3>
                <p className="text-muted-foreground">Choose a chat from the left or start a new one</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
