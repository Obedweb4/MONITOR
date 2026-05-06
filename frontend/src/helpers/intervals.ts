export const INTERVAL_OPTIONS = [
  { value: 0.5,  label: "30 seconds" },
  { value: 1,    label: "1 minute"   },
  { value: 3,    label: "3 minutes"  },
  { value: 5,    label: "5 minutes"  },
  { value: 10,   label: "10 minutes" },
  { value: 15,   label: "15 minutes" },
  { value: 30,   label: "30 minutes" },
  { value: 60,   label: "1 hour"     },
  { value: 120,  label: "2 hours"    },
  { value: 360,  label: "6 hours"    },
  { value: 720,  label: "12 hours"   },
  { value: 1440, label: "24 hours"   },
];

export function formatInterval(mins: number): string {
  if (mins < 1)   return `${Math.round(mins * 60)}s`;
  if (mins === 1) return "1 min";
  if (mins < 60)  return `${mins} mins`;
  if (mins === 60) return "1 hour";
  return `${mins / 60} hours`;
}
