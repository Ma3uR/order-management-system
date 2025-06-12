import { MoveDownLeft, MoveUpRight } from "lucide-react";

interface StatItemProps {
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  label: string;
}

function StatItem({ value, change, changeType, label }: StatItemProps) {
  const IconComponent = changeType === 'positive' ? MoveUpRight : MoveDownLeft;
  const iconColor = changeType === 'positive' ? 'text-primary' : 'text-destructive';

  return (
    <div className="flex gap-0 flex-col justify-between p-4 border rounded-md bg-card">
      <IconComponent className={`w-4 h-4 mb-4 ${iconColor}`} />
      <h2 className="text-2xl tracking-tighter text-left font-regular flex flex-row gap-2 items-end">
        {value}
        <span className="text-muted-foreground text-xs tracking-normal">
          {change}
        </span>
      </h2>
      <p className="text-sm leading-relaxed tracking-tight text-muted-foreground text-left mt-1">
        {label}
      </p>
    </div>
  );
}

interface StatsProps {
  stats?: StatItemProps[];
}

function Stats({ stats }: StatsProps) {
  const defaultStats: StatItemProps[] = [
    {
      value: "500.000",
      change: "+20.1%",
      changeType: 'positive',
      label: "Monthly active users"
    },
    {
      value: "20.105",
      change: "-2%",
      changeType: 'negative',
      label: "Daily active users"
    },
    {
      value: "$523.520",
      change: "+8%",
      changeType: 'positive',
      label: "Monthly recurring revenue"
    },
    {
      value: "$1052",
      change: "+2%",
      changeType: 'positive',
      label: "Cost per acquisition"
    }
  ];

  const statsToRender = stats || defaultStats;

  return (
    <div className="w-full mb-6">
      <div className="grid text-left grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-4">
        {statsToRender.map((stat, index) => (
          <StatItem
            key={index}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            label={stat.label}
          />
        ))}
      </div>
    </div>
  );
}

export { Stats, type StatItemProps };