"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarSeparator,
  ModeToggle,
  Icon,
  Text,
} from "@kognitos/lattice";
import { useChatContext } from "@/lib/chat/chat-context";

export function AppSidebar() {
  const pathname = usePathname();
  const {
    sessions,
    activeSessionId,
    loadSession,
    deleteSession,
  } = useChatContext();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <Icon type="Shield" size="md" />
          <div>
            <Text level="base" weight="semibold">
              Claims Hub
            </Text>
            <Text level="xSmall" color="muted">
              Payer Claims Analysis
            </Text>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/">
                    <Icon type="BarChart3" size="sm" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/claims")}>
                  <Link href="/claims">
                    <Icon type="FileText" size="sm" />
                    <span>Claims</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/review")}>
                  <Link href="/review">
                    <Icon type="CircleAlert" size="sm" />
                    <span>Review Queue</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/chat")}>
                  <Link href="/chat">
                    <Icon type="MessageSquare" size="sm" />
                    <span>Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sessions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Chat History</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={session.id === activeSessionId}
                      onClick={() => loadSession(session.id)}
                      className="truncate"
                    >
                      <Icon type="MessageCircle" size="xs" />
                      <span className="truncate">{session.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      onClick={() => deleteSession(session.id)}
                      title="Delete conversation"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon type="Trash" size="xs" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center justify-between">
          <Text level="xSmall" color="muted">Powered by Kognitos</Text>
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
