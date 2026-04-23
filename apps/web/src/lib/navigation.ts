export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Students", href: "/students" },
  { label: "Finance", href: "/finance" },
  { label: "Registrar", href: "/registrar" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];
