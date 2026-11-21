"use client";

import { Tabs } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { id: "configurations", label: "Configurations" },
  { id: "images", label: "Images" },
  { id: "statistics", label: "Statistics" },
] as const;

export type Tab = (typeof TABS)[number]["id"];

export function ServerTabs({ serverId }: { serverId: string }) {
  const selected = usePathname().split("/")[3];

  return (
    <Tabs selectedKey={selected}>
      <Tabs.ListContainer>
        <Tabs.List aria-label="Server pages">
          {TABS.map(({ id, label }) => (
            <Tabs.Tab
              key={id}
              id={id}
              href={`/servers/${serverId}/${id}`}
              // React Aria: check `'href' in props` to tell whether to render an <a>.
              render={(props) =>
                "href" in props ? <NextLink {...props} /> : <div {...props} />
              }
            >
              {label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
