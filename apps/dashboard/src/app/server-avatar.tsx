import { Avatar } from "@heroui/react";

export function ServerAvatar({
  server,
}: {
  server: { id: string; name: string; icon: string | null };
}) {
  return (
    <Avatar>
      {server.icon && (
        <Avatar.Image
          alt=""
          src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
        />
      )}
      <Avatar.Fallback>{server.name.charAt(0)}</Avatar.Fallback>
    </Avatar>
  );
}
