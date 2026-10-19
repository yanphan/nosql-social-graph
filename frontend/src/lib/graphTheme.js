export const NODE = {
  User: '#6366F1',
  Post: '#22D3EE',
  Topic: '#F59E0B',
};

export const EDGE = {
  FOLLOWS: '#6366F1',
  POSTED: '#94A3B8',
  ABOUT: '#F59E0B',
  LIKED: '#F43F5E',
  SHARED: '#10B981',
  COMMENTED: '#A78BFA',
  INTERESTED_IN: '#F59E0B',
};

export const cyStyle = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      color: '#E6E9F5',
      'font-size': 10,
      'font-family': 'Inter, sans-serif',
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'background-color': 'data(color)',
      width: 'data(size)',
      height: 'data(size)',
      'border-width': 2,
      'border-color': 'rgba(255, 255, 255, 0.25)',
      'transition-property': 'opacity, border-width, border-color',
      'transition-duration': '150ms',
    },
  },
  {
    selector: 'node[type = "Post"]',
    style: {
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'node[type = "Topic"]',
    style: {
      shape: 'hexagon',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      opacity: 0.7,
      'arrow-scale': 0.8,
    },
  },
  {
    selector: '.dim',
    style: {
      opacity: 0.12,
    },
  },
  {
    selector: '.hl',
    style: {
      'border-width': 4,
      'border-color': '#FFFFFF',
      opacity: 1,
    },
  },
  {
    selector: 'edge.flow',
    style: {
      'line-style': 'dashed',
      width: 3,
      opacity: 1,
      'line-dash-pattern': [6, 3],
    },
  },
];
