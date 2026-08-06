import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Loader2,
  ArrowLeft,
} from "lucide-react";
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
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profilesMap, setProfilesMap] = useState<
    Map<string, { full_name: string; role?: string }>
  >(new Map());

  useEffect(() => {
    if (user) {
      fetchProfilesMap().then(() => fetchConversations());
    }
  }, [user]);

  useEffect(() => {
    if (activeConv) fetchMessages(activeConv);
  }, [activeConv, profilesMap]);

  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages-${activeConv}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          const p = profilesMap.get(msg.sender_id);
          msg.sender_name = p?.full_name || "Unknown";
          msg.sender_role = p?.role;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv, profilesMap]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProfilesMap = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);
    const map = new Map<string, { full_name: string; role?: string }>();
    profiles?.forEach((p) => {
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
      const convIds = memberRows.map((m) => m.conversation_id);
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (convs) {
        const enriched = await Promise.all(
          convs.map(async (c) => {
            if (c.type === "private" && !c.name) {
              const { data: members } = await supabase
                .from("conversation_members")
                .select("user_id")
                .eq("conversation_id", c.id);
              const otherId = members?.find(
                (m) => m.user_id !== user!.id,
              )?.user_id;
              if (otherId) {
                const p = profilesMap.get(otherId);
                return { ...c, name: p?.full_name || "Private Chat" };
              }
            }
            return c;
          }),
        );
        setConversations(enriched);
        if (!activeConv && enriched.length > 0) {
          setActiveConv(enriched[0].id);
          setShowChatList(false);
        }
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

    const enriched = (data || []).map((m) => {
      const p = profilesMap.get(m.sender_id);
      return {
        ...m,
        sender_name: p?.full_name || "Unknown",
        sender_role: p?.role,
      };
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
    const { data: myConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);
    const { data: theirConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUser.id);
    const myIds = new Set(myConvs?.map((c) => c.conversation_id) || []);
    const common =
      theirConvs
        ?.filter((c) => myIds.has(c.conversation_id))
        .map((c) => c.conversation_id) || [];
    for (const cid of common) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("type")
        .eq("id", cid)
        .single();
      if (conv?.type === "private") {
        setActiveConv(cid);
        setShowChatList(false);
        setNewChatDialog(false);
        return;
      }
    }
    const newId = crypto.randomUUID();
    const { error: convError } = await supabase
      .from("conversations")
      .insert({ id: newId, type: "private", name: null, created_by: user.id });
    if (convError) {
      toast.error("Failed to create conversation: " + convError.message);
      return;
    }
    const { error: memberError } = await supabase
      .from("conversation_members")
      .insert([
        { conversation_id: newId, user_id: user.id },
        { conversation_id: newId, user_id: otherUser.id },
      ]);
    if (memberError) {
      toast.error("Failed to add members: " + memberError.message);
      return;
    }
    setNewChatDialog(false);
    await fetchConversations();
    setActiveConv(newId);
    setShowChatList(false);
    toast.success(`Chat with ${otherUser.full_name} started!`);
  };

  const loadAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .neq("id", user!.id);
    setAllUsers(data || []);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  const formatRole = (role?: string) =>
    role ? role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  const activeConvData = conversations.find((c) => c.id === activeConv);
  const filteredUsers = allUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()),
  );

  const selectConversation = (id: string) => {
    setActiveConv(id);
    setShowChatList(false);
  };

  return (
    <DashboardLayout>
      <div className="-m-4 -mb-28 sm:-m-6 sm:-mb-28 lg:-m-8 lg:-mb-28 md:-mb-10 flex h-[calc(100dvh-3.5rem)] overflow-hidden md:gap-3 md:p-3">
        {/* Chat list */}
        <div
          className={`w-full min-w-0 flex-col overflow-hidden border-border bg-background/60 backdrop-blur-xl md:flex md:w-80 md:shrink-0 md:rounded-2xl md:border ${!showChatList ? "hidden md:flex" : "flex"}`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <MessageSquare className="h-5 w-5 text-primary" /> Chats
            </h2>
            <Dialog
              open={newChatDialog}
              onOpenChange={(open) => {
                setNewChatDialog(open);
                if (open) loadAllUsers();
              }}
            >
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Start Private Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search users..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                  />
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredUsers.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No users found
                        </p>
                      ) : (
                        filteredUsers.map((u) => (
                          <Button
                            key={u.id}
                            variant="ghost"
                            className="h-auto w-full justify-start gap-3 py-2"
                            onClick={() => startPrivateChat(u)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                {getInitials(u.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 text-left">
                              <p className="truncate text-sm font-medium">
                                {u.full_name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {u.email}
                              </p>
                            </div>
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            ) : conversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No conversations yet
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => selectConversation(c.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${activeConv === c.id ? "bg-primary/10" : ""}`}
                    >
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary">
                          {c.type === "group" ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            getInitials(c.name || "Private Chat")
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {c.name || "Private Chat"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.type === "group" ? "Group chat" : "Direct message"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Conversation panel */}
        <div
          className={`min-w-0 flex-1 flex-col overflow-hidden border-border bg-background/40 backdrop-blur-xl md:flex md:rounded-2xl md:border ${showChatList ? "hidden md:flex" : "flex"}`}
        >
          {activeConv ? (
            <>
              <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/70 px-2 md:px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 md:hidden"
                  onClick={() => setShowChatList(true)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {activeConvData?.type === "group" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      getInitials(activeConvData?.name || "Chat")
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    {activeConvData?.name || "Chat"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {activeConvData?.type === "group"
                      ? "Group conversation"
                      : "Online chat"}
                  </p>
                </div>
                {activeConvData?.type === "group" && (
                  <Badge variant="outline" className="text-xs">
                    Group
                  </Badge>
                )}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-4 md:px-6">
                {messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.sender_id === user?.id;
                    const prev = messages[idx - 1];
                    const grouped = prev && prev.sender_id === m.sender_id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}
                      >
                        <div
                          className={`max-w-[85%] px-3 py-2 shadow-sm md:max-w-[65%] ${
                            isMe
                              ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-2xl rounded-bl-md bg-muted text-foreground"
                          }`}
                        >
                          {!isMe && !grouped && (
                            <p className="mb-0.5 text-xs font-semibold text-primary">
                              {m.sender_name}
                              {m.sender_role && (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  ({formatRole(m.sender_role)})
                                </span>
                              )}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {m.content}
                          </p>
                          <p
                            className={`mt-0.5 text-right text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex shrink-0 items-end gap-2 border-t border-border bg-background/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-3">
                <Input
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="h-11 rounded-full border-border bg-muted/50 px-4 text-sm"
                />
                <Button
                  onClick={handleSend}
                  disabled={isSending || !newMessage.trim()}
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a chat or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
