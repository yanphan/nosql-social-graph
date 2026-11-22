export const topicColors = [
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#EC4899', // Rose
];

export function getTopicColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return topicColors[Math.abs(hash) % topicColors.length];
}

export default getTopicColor;
