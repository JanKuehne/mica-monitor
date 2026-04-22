interface Props {
  overviewContent: React.ReactNode;
  sidebarContent: React.ReactNode;
}

// Kept the file + name as a drop-in so the detail page doesn't need rewiring.
// News was dropped — the public DB doesn't carry news and maintenance cost
// outweighs the value on the public view.
export default function CompanyDetailTabs({ overviewContent, sidebarContent }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">{overviewContent}</div>
      <div className="space-y-6">{sidebarContent}</div>
    </div>
  );
}
