// Pins share the same session lifetime as the trip store.
const pins = new Map();

export const getChatPin = chatKey => pins.get(chatKey) || null;
export const setChatPin = (chatKey, tripId) => pins.set(chatKey, tripId);
export const removeChatPin = chatKey => pins.delete(chatKey);
