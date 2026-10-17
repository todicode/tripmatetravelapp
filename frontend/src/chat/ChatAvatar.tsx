import React from 'react';
import { Avatar } from './chatUi';
import { useChatImage } from './useChatImage';

export default function ChatAvatar({
  mediaId,
  load,
  ...props
}: React.ComponentProps<typeof Avatar> & {
  mediaId?: string | null;
  load?: (id: string) => Promise<string>;
}) {
  const image = useChatImage(mediaId, load);
  return <Avatar {...props} uri={image.uri} />;
}
