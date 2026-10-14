import { Collapse } from 'antd';
import { HELP } from '../help';

export function HelpPanel() {
  return (
    <Collapse
      size="small"
      accordion
      items={HELP.map((h) => ({
        key: h.title,
        label: <span className="font-medium">{h.title}</span>,
        children: (
          <div className="text-xs">
            <p className="mt-0 text-neutral-500">{h.intro}</p>
            <dl className="m-0">
              {h.items.map(([label, text]) => (
                <div key={label} className="mb-2">
                  <dt className="font-semibold">{label}</dt>
                  <dd className="m-0 text-neutral-600 dark:text-neutral-300">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        ),
      }))}
    />
  );
}
