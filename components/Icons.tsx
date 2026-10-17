// Line icons (24px grid, 1.8 stroke) so the UI doesn't lean on emoji.
type P = { size?: number; className?: string };
const svg = (d: React.ReactNode, { size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{d}</svg>
);
export const MapIcon = (p: P) => svg(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>, p);
export const TicketIcon = (p: P) => svg(<><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z" /><path d="M14 6v12" strokeDasharray="2 2" /></>, p);
export const StoreIcon = (p: P) => svg(<><path d="M4 9.5 5.5 4h13L20 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" /><path d="M5 11.5V20h14v-8.5M10 20v-5h4v5" /></>, p);
export const SearchIcon = (p: P) => svg(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p);
export const CheckIcon = (p: P) => svg(<path d="m5 12.5 4.5 4.5L19 7.5" />, p);
export const CloseIcon = (p: P) => svg(<path d="M6 6l12 12M18 6 6 18" />, p);
export const LockIcon = (p: P) => svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, p);
export const NfcIcon = (p: P) => svg(<><path d="M6 8.5a6 6 0 0 1 0 7M9.5 6a10 10 0 0 1 0 12M13 4a13 13 0 0 1 0 16" /></>, p);
export const ArrowIcon = (p: P) => svg(<path d="M5 12h14m-5-5 5 5-5 5" />, p);
export const ChatIcon = (p: P) => svg(<><path d="M5 18.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9Z" /><path d="M9 9h6M9 12h4" /></>, p);
export const BookIcon = (p: P) => svg(<><path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5Z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" /><path d="M9 8h6" /></>, p);
export const UserIcon = (p: P) => svg(<><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" /></>, p);
export const HeartIcon = (p: P) => svg(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />, p);
export const ShareIcon = (p: P) => svg(<><path d="M12 15V4m-4 4 4-4 4 4" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>, p);
export const ChipIcon = (p: P) => svg(<><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 10h4v4h-4zM9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" /></>, p);
export const ChefIcon = (p: P) => svg(<><path d="M7 17v3h10v-3" /><path d="M7 17a4 4 0 0 1-1.2-7.8A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 6.2 4.2A4 4 0 0 1 17 17Z" /><path d="M10 17v-3M14 17v-3" /></>, p);
export const MicIcon = (p: P) => svg(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></>, p);
export const StarIcon = (p: P) => svg(<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />, p);
export const NoteIcon = (p: P) => svg(<><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>, p);
export const HeadphonesIcon = (p: P) => svg(<><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3.5" y="14" width="4" height="6" rx="1.5" /><rect x="16.5" y="14" width="4" height="6" rx="1.5" /></>, p);
export const UtensilsIcon = (p: P) => svg(<><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 21V3c-2 1.5-3 4-3 7h3" /></>, p);
export const CupIcon = (p: P) => svg(<><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2M14 3v2" /></>, p);
export const BowlIcon = (p: P) => svg(<><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z" /><path d="M8 21h8M14 3 10 9M18 4l-5 6" /></>, p);
export const BeerIcon = (p: P) => svg(<><path d="M6 7h10v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" /><path d="M16 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 7a3 3 0 0 1 5-2.2A3 3 0 0 1 16 7M9.5 11v6M12.5 11v6" /></>, p);
export const BreadIcon = (p: P) => svg(<><path d="M5 11a4 4 0 0 1 1-8h12a4 4 0 0 1 1 8v9H5Z" /><path d="M9 7l2 2M13 6l2 2" /></>, p);
export const CakeIcon = (p: P) => svg(<><path d="M4 20h16M5 20v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" /><path d="M5 15c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 7v4M12 4.5a1 1 0 0 1 0 0" /><path d="M12 3c.9.8.9 2 0 2.6-.9-.6-.9-1.8 0-2.6Z" /></>, p);
export const ShieldIcon = (p: P) => svg(<><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></>, p);

/** Category label -> a line icon (fallback when a venue has no photo). */
export function FoodIcon({ label, size = 26 }: { label?: string; size?: number }) {
  const l = label ?? "";
  if (/카페|커피|디저트|차|Cafe|Coffee|Dessert|Tea/i.test(l)) return <CupIcon size={size} />;
  if (/베이커리|빵|케이크|Bakery|Bread|Cake/i.test(l)) return <BreadIcon size={size} />;
  if (/맥주|호프|주점|바\(BAR\)|이자카야|와인|Pub|Bar|Beer|Wine|Izakaya/i.test(l)) return <BeerIcon size={size} />;
  if (/국수|냉면|탕|국밥|순대|면|Noodle|Soup|Naengmyeon|Gukbap/i.test(l)) return <BowlIcon size={size} />;
  return <UtensilsIcon size={size} />;
}
export const RouteIcon = (p: P) => svg(<><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>, p);
export const TaxiIcon = (p: P) => svg(<><path d="M5 16V12l1.8-4.5A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.5L19 12v4" /><rect x="3.5" y="12" width="17" height="5" rx="1.5" /><path d="M6.5 17v2M17.5 17v2M10 3.5h4" /></>, p);
