import { useState, memo } from "react";
import { useMutation, useAction, useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Copy,
  MoreHorizontal,
  X,
  Hash,
  Clock,
  Search,
  Sparkles,
  User,
  Eye,
  EyeOff,
  ChevronDown,
  Pin,
  PinOff,
  Share2,
  Download,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SidebarProps {
  currentConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewConversation: () => void | Promise<void>;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Sidebar = memo(function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isSidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<Id<"conversations"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Id<"conversations"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New state for share and export
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  // Get user data and preferences
  const user = useQuery(api.auth.loggedInUser);
  const preferences = useQuery(api.preferences.get);
  const updatePreferences = useMutation(api.preferences.update);

  // Use paginated query for conversations
  const {
    results: conversations,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.conversations.listWithMessageCounts,
    {},
    { initialNumItems: 15 }
  );

  const deleteConversation = useMutation(api.conversations.remove);
  const updateTitle = useMutation(api.conversations.updateTitle);
  const duplicateConversation = useMutation(api.conversations.duplicate);
  const generateTitle = useAction(api.conversations.generateTitle);
  
  // New mutations for pin, share, export
  const togglePin = useMutation(api.conversations.togglePin);
  const shareConversation = useMutation(api.conversations.shareConversation);
  const unshareConversation = useMutation(api.conversations.unshareConversation);
  const markExported = useMutation(api.conversations.markExported);
  
  // Query for export data when dialog is open
  const exportData = useQuery(
    api.conversations.exportConversation, 
    activeConversationId && exportDialogOpen ? { conversationId: activeConversationId } : "skip"
  );

  // Filter conversations with more than 1 message
  const filteredConversations = conversations.filter((conv: any) => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const hasMultipleMessages = (conv.messageCount || 0) > 1;
    return matchesSearch && hasMultipleMessages;
  });

  // Sort filtered conversations to show pinned conversations first
  const sortedFilteredConversations = filteredConversations.sort((a: any, b: any) => {
    // First sort by pinned status (pinned first)
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then sort by lastMessageAt (newest first)
    return b.lastMessageAt - a.lastMessageAt;
  });

  const handleDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation({ conversationId: conversationToDelete });
      if (currentConversationId === conversationToDelete) {
        const firstConversation = sortedFilteredConversations.filter((c: any) => c._id !== conversationToDelete)[0];
        if (firstConversation) {
          onSelectConversation(firstConversation._id);
        }
      }
      setConversationToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const toggleUserInfoVisibility = async () => {
    if (preferences) {
      await updatePreferences({
        ...preferences,
        hideUserInfo: !preferences.hideUserInfo,
      });
    }
  };
  
  const openDeleteDialog = (id: Id<"conversations">) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = async (id: Id<"conversations">) => {
    const newConversationId = await duplicateConversation({ conversationId: id });
    onSelectConversation(newConversationId);
  };

  const handleEdit = (conversation: any) => {
    setEditingId(conversation._id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await updateTitle({
        conversationId: editingId,
        title: editTitle.trim(),
      });
      setEditingId(null);
      setEditTitle("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleGenerateTitle = async (conversationId: Id<"conversations">, firstMessage: string) => {
    try {
      await generateTitle({
        conversationId,
        firstUserMessage: firstMessage
      });
    } catch (error) {
      console.error("Failed to generate title:", error);
    }
  };

  // New handler functions for pin, share, export/import
  const handleTogglePin = async (conversationId: Id<"conversations">) => {
    try {
      await togglePin({ conversationId });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleShare = async (conversationId: Id<"conversations">) => {
    try {
      const shareId = await shareConversation({ conversationId });
      const url = `${window.location.origin}/shared/${shareId}`;
      setShareUrl(url);
      setActiveConversationId(conversationId);
      setShareDialogOpen(true);
    } catch (error) {
      console.error("Failed to share conversation:", error);
    }
  };

  const handleUnshare = async (conversationId: Id<"conversations">) => {
    try {
      await unshareConversation({ conversationId });
      setShareDialogOpen(false);
    } catch (error) {
      console.error("Failed to unshare conversation:", error);
    }
  };

  const handleExport = async (conversationId: Id<"conversations">) => {
    setActiveConversationId(conversationId);
    setExportDialogOpen(true);
  };

  const handleDownloadExport = async () => {
    if (exportData && activeConversationId) {
      try {
        await markExported({ conversationId: activeConversationId });
        
        const conversation = conversations.find(c => c._id === activeConversationId);
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conversation?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Failed to export conversation:", error);
      }
    }
  };



  const formatLastMessageTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Function to truncate title with smart word breaking
  const truncateTitle = (title: string, maxLength: number = 25) => {
    if (title.length <= maxLength) return title;
    
    // Try to break at word boundary
    const truncated = title.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.6) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  };

  return (
    <TooltipProvider>
    <div className={cn(
      "h-full bg-gradient-to-br from-background via-background/95 to-muted/30 border-r border-border/50 flex flex-col backdrop-blur-sm relative overflow-hidden w-80",
      "before:absolute before:inset-0 before:bg-gradient-to-tr before:from-primary/5 before:via-transparent before:to-accent/5 before:opacity-50"
    )}>
      {/* User Profile Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-background/90 via-background/80 to-muted/20 backdrop-blur-sm relative z-10">
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50">
            {user.image ? (
              <img
                src={user.image}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border border-border/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                preferences?.hideUserInfo && "blur-sm select-none"
              )}>
                {user.name ?? user.email}
              </p>
              <p className={cn(
                "text-xs text-muted-foreground truncate",
                preferences?.hideUserInfo && "blur-sm select-none"
              )}>
                {user.email}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void toggleUserInfoVisibility()}
                className="h-8 w-8 hover:bg-background/80"
                title={preferences?.hideUserInfo ? "Show user info" : "Hide user info"}
              >
                {preferences?.hideUserInfo ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="hover:bg-background/80 rounded-2xl h-8 w-8 lg:hidden"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={() => void onNewConversation()}
          className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-primary via-primary/95 to-primary/80 hover:from-primary/90 hover:via-primary/85 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">New Chat</span>
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm border border-border/50 rounded-2xl bg-background/50 focus:bg-background focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {sortedFilteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className={cn(
                "group relative rounded-2xl transition-all duration-200 hover:shadow-md",
                currentConversationId === conversation._id
                  ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-sm"
                  : "hover:bg-muted/60 border border-transparent"
              )}
            >
              {editingId === conversation._id ? (
                <div className="p-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    onBlur={() => void handleSaveEdit()}
                    className="w-full px-4 py-3 text-sm border border-primary/50 rounded-2xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                    autoFocus
                  />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => onSelectConversation(conversation._id)}
                  className="w-full justify-start h-auto py-3 px-3 hover:bg-transparent"
                >
                                      <div className="flex items-start gap-3 w-full">
                    <div className={cn(
                      "w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 relative",
                      currentConversationId === conversation._id
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <MessageSquare size={14} />
                      {conversation.isPinned && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-primary/60 to-primary/80 rounded-full flex items-center justify-center shadow-sm ring-1 ring-background/60">
                          <Pin size={9} className="text-primary-foreground/90 transform rotate-12" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left space-y-1">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className={cn(
                              "text-sm font-medium truncate cursor-default",
                              currentConversationId === conversation._id
                                ? "text-primary"
                                : "text-foreground"
                            )}>
                              {truncateTitle(conversation.title)}
                            </p>
                          </TooltipTrigger>
                                                     {conversation.title.length > 25 && (
                             <TooltipContent side="right" className="max-w-xs">
                               <p className="text-sm">{conversation.title}</p>
                             </TooltipContent>
                           )}
                        </Tooltip>
                        {conversation.messageCount && (
                          <div className="flex items-center gap-1">
                            <Hash size={10} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-mono">
                              {conversation.messageCount}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatLastMessageTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {editingId !== conversation._id && (
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-background/80 backdrop-blur-sm"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => void handleTogglePin(conversation._id)}>
                        {conversation.isPinned ? (
                          <>
                            <PinOff className="mr-2 h-4 w-4" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="mr-2 h-4 w-4" />
                            Pin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEdit(conversation)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => void handleGenerateTitle(conversation._id, conversation.title)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Title
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => void handleDuplicate(conversation._id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleShare(conversation._id)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleExport(conversation._id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(conversation._id)} 
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
          
          {sortedFilteredConversations.length === 0 && (
            <div className="text-center text-muted-foreground p-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto">
                <MessageSquare size={24} className="text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">
                  {searchQuery ? "No matching conversations" : "No conversations yet"}
                </p>
                <p className="text-sm">
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Start a new chat to begin your conversation"
                  }
                </p>
              </div>
            </div>
          )}

          {/* Load More Button */}
          {status === "CanLoadMore" && (
            <div className="px-2 py-2">
              <Button
                variant="outline"
                onClick={() => loadMore(15)}
                className="w-full rounded-2xl border-dashed"
              >
                <ChevronDown size={16} className="mr-2" />
                Load More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 size={18} className="text-destructive" />
              Delete Conversation
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the conversation and all its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 size={18} className="text-primary" />
              Share Conversation
            </DialogTitle>
            <DialogDescription>
              Anyone with this link can view the conversation (read-only).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-url">Share URL</Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(shareUrl)}
                >
                  <Copy size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(shareUrl, '_blank')}
                >
                  <ExternalLink size={16} />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Close
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => activeConversationId && void handleUnshare(activeConversationId)}
            >
              Revoke Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={18} className="text-primary" />
              Export Conversation
            </DialogTitle>
            <DialogDescription>
              Download the conversation as a JSON file that can be imported later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {exportData ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Export includes {exportData.messages.length} messages and {exportData.branches.length} branches.
                </p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Ready to download:</p>
                  <p className="text-xs text-muted-foreground">
                    {exportData.conversation.title} • {new Date(exportData.exportedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Preparing export...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => void handleDownloadExport()}
              disabled={!exportData}
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
    </TooltipProvider>
  );
}); 