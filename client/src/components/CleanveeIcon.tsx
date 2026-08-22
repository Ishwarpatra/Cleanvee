import React, { type SVGProps } from "react";

export type CleanveeIconName =
  | "mark" | "shift" | "review" | "site" | "reports" | "team" | "rules" | "admin"
  | "sync" | "offline" | "search" | "notice" | "proof" | "add" | "issue" | "export"
  | "warning" | "waiting" | "approved" | "verified" | "close" | "back" | "launch" | "retake" | "send" | "chevronRight" | "chevronDown";

type CleanveeIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: CleanveeIconName;
  size?: number;
  title?: string;
};

function Glyph({ name }: { name: CleanveeIconName }) {
  switch (name) {
    case "mark": return <><path d="m12 2.7 2.1 7.2 7.2 2.1-7.2 2.1-2.1 7.2-2.1-7.2-7.2-2.1 7.2-2.1Z" fill="currentColor" fillOpacity=".16" stroke="none" /><path d="m12 2.7 2.1 7.2 7.2 2.1-7.2 2.1-2.1 7.2-2.1-7.2-7.2-2.1 7.2-2.1Z" /><circle cx="12" cy="12" r="1.25" /></>;
    case "shift": return <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M7.5 12h3l1.8 2.2L16.5 8" /><path d="M7.5 16.5h9" /></>;
    case "review": return <><path d="M6 3.8h9.3L19 7.5v12.7H6z" /><path d="M15.3 3.8v3.8H19" /><path d="M9 11.2h6M9 14.7h3" /><path d="m13.5 17 1.3 1.2 2.4-2.7" /></>;
    case "site": return <><path d="m3.5 6 5-2.4 7 2.4 5-2.4v14.4l-5 2.4-7-2.4-5 2.4Z" /><path d="M8.5 3.6V18M15.5 6v14" /><circle cx="12" cy="11" r="2.1" /><path d="M12 13.1v2.1" /></>;
    case "reports": return <><path d="M4 19.5h16" /><path d="M6.3 17v-4.2M11.8 17V7M17.3 17v-7.2" /><path d="m5.8 9.2 4.4-2.7 3.4 2 4.7-4" /></>;
    case "team": return <><circle cx="9" cy="8.4" r="2.7" /><circle cx="16.8" cy="9.5" r="2.1" /><path d="M4.5 19c.6-3.5 2.2-5.1 4.8-5.1s4.2 1.6 4.8 5.1" /><path d="M14.4 15.3c2.9-.2 4.6 1.1 5.1 3.7" /></>;
    case "rules": return <><path d="M5 6.5h14M5 12h14M5 17.5h14" /><circle cx="9" cy="6.5" r="1.7" fill="currentColor" /><circle cx="15" cy="12" r="1.7" fill="currentColor" /><circle cx="11" cy="17.5" r="1.7" fill="currentColor" /></>;
    case "admin": return <><path d="M12 3.2 19 6v5.8c0 4.2-2.5 7.2-7 9-4.5-1.8-7-4.8-7-9V6z" /><path d="M9.2 12.1 11.2 14l3.8-4" /><path d="M12 6.5v1.2" /></>;
    case "sync": return <><path d="M5.2 8.5A7.7 7.7 0 0 1 18.4 6L20 8.2" /><path d="M18.4 6v3.2h-3.2" /><path d="M18.8 15.5A7.7 7.7 0 0 1 5.6 18L4 15.8" /><path d="M5.6 18v-3.2h3.2" /></>;
    case "offline": return <><path d="M5.2 8.5A7.7 7.7 0 0 1 18.4 6L20 8.2" /><path d="M18.4 6v3.2h-3.2" /><path d="m4 4 16 16" /><path d="M18.8 15.5A7.7 7.7 0 0 1 9.3 19" /></>;
    case "search": return <><circle cx="10.4" cy="10.4" r="5.6" /><path d="m14.6 14.6 4.6 4.6" /><path d="M8.2 10.4h4.4M10.4 8.2v4.4" /></>;
    case "notice": return <><path d="M6.5 16.8h11l-1.3-2.1v-4.1c0-2.7-1.5-4.5-4.2-4.5s-4.2 1.8-4.2 4.5v4.1z" /><path d="M10 19.1h4" /><circle cx="18.4" cy="6" r="1.7" fill="currentColor" /></>;
    case "proof": return <><rect x="3.5" y="6.8" width="17" height="12.2" rx="3" /><path d="M8 6.8 9.4 4.7h5.2L16 6.8" /><circle cx="12" cy="13" r="3" /><path d="m10.8 13 1.1 1.1 2.1-2.3" /></>;
    case "add": return <><path d="M12 3.3 20.7 12 12 20.7 3.3 12Z" /><path d="M8.4 12h7.2M12 8.4v7.2" /></>;
    case "issue": return <><path d="M12 3.4 21 19.5H3Z" /><path d="M12 9v4.4" /><circle cx="12" cy="16.5" r=".7" fill="currentColor" /></>;
    case "export": return <><path d="M5 15.8v3.7h14v-3.7" /><path d="M12 4.5v10" /><path d="m8.7 11.3 3.3 3.2 3.3-3.2" /><path d="M7.4 5.3h9.2" /></>;
    case "warning": return <><path d="M12 3.5 21 19.2H3Z" /><path d="M12 9v4.6" /><circle cx="12" cy="16.4" r=".7" fill="currentColor" /></>;
    case "waiting": return <><circle cx="12" cy="12" r="8.3" /><path d="M12 7.8v4.7l3.1 1.8" /><path d="M8.1 4.7 6.7 3.5M15.9 4.7l1.4-1.2" /></>;
    case "approved": return <><path d="M12 3.5 19 7v5.3c0 3.7-2.5 6.5-7 8.2-4.5-1.7-7-4.5-7-8.2V7Z" /><path d="m8.7 12 2.1 2.1 4.5-4.6" /></>;
    case "verified": return <><circle cx="12" cy="12" r="8.5" /><path d="m8.4 12 2.3 2.3 5-5" /></>;
    case "close": return <><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></>;
    case "back": return <><path d="M19.5 12H5" /><path d="m10.3 6.8-5.2 5.2 5.2 5.2" /></>;
    case "launch": return <><path d="M7 5h12v12" /><path d="m19 5-9.5 9.5" /><path d="M5 9.5V19h9.5" /></>;
    case "retake": return <><path d="M18.8 9.2A7.6 7.6 0 0 0 5.9 7.5L4 9.8" /><path d="M4 9.8h4.1V5.7" /><path d="M5.2 14.8a7.6 7.6 0 0 0 12.9 1.7l1.9-2.3" /><path d="M20 14.2h-4.1v4.1" /></>;
    case "send": return <><path d="m4 4.7 16 7.3-16 7.3 2.3-6.1L4 4.7Z" /><path d="M6.3 13.2H13" /></>;
    case "chevronRight": return <path d="m9 5 7 7-7 7" />;
    case "chevronDown": return <path d="m5 9 7 7 7-7" />;
  }
}

export function CleanveeIcon({ name, size = 18, title, ...props }: CleanveeIconProps) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} data-cleanvee-icon={name} {...props}>{title ? <title>{title}</title> : null}<Glyph name={name} /></svg>;
}

export function CleanveeMark({ size = 16, title = "Cleanvee" }: Pick<CleanveeIconProps, "size" | "title">) {
  return <CleanveeIcon name="mark" size={size} title={title} />;
}
