import { Home, Plus, MessageCircle, Users, User, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePosts } from "@/context/PostContext";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Plus, label: "Create", path: "/create" },
  { icon: MessageCircle, label: "Chats", path: "/chats" },
  { icon: Users, label: "Community", path: "/community" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const { unreadNotifications, unreadMessages } = usePosts();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item px-3 py-2 ${isActive ? "active" : ""}`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-all duration-200 ${isActive ? "scale-110" : ""
                    }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.label === "Alerts" && unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-background">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
                {item.label === "Chats" && unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm ring-1 ring-background">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for mobile */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
};

export default BottomNav;
