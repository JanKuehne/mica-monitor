"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, Star } from "lucide-react";

interface NewsItem {
  id: string;
  headline: string;
  snippet: string | null;
  url: string | null;
  source_name: string | null;
  published_at: string | null;
  relevance: "high" | "medium" | "low";
}

interface Props {
  overviewContent: React.ReactNode;
  sidebarContent: React.ReactNode;
  news: NewsItem[];
}

export default function CompanyDetailTabs({ overviewContent, sidebarContent, news }: Props) {
  const [tab, setTab] = useState<"overview" | "news">("overview");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("overview")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            tab === "overview" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("news")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            tab === "news" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          News {news.length > 0 && `(${news.length})`}
        </button>
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {overviewContent}
          </div>
          <div className="space-y-6">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* News tab */}
      {tab === "news" && (
        <div className="space-y-3">
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No news articles found for this company.
            </p>
          ) : (
            news.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-1.5">
                <div className="flex items-start gap-2">
                  {item.relevance === "high" && (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline leading-snug"
                      >
                        {item.headline}
                      </a>
                    ) : (
                      <p className="font-medium text-sm leading-snug">{item.headline}</p>
                    )}
                    {item.snippet && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.snippet}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      {item.source_name && <span className="font-medium">{item.source_name}</span>}
                      {item.source_name && item.published_at && <span>·</span>}
                      {item.published_at && (
                        <span>
                          {new Date(item.published_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      )}
                      {item.url && (
                        <>
                          <span>·</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 hover:text-foreground"
                          >
                            Read <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
