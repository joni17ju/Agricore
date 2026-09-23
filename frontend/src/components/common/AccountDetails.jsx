import Icon from './Icon.jsx';

/**
 * Labelled two-column grid of account fields.
 *
 * The previous layout showed bare values in a single row with no field names,
 * so an ID number and a section name were indistinguishable at a glance. Each
 * value now carries its label, and the grid collapses to one column on narrow
 * screens rather than wrapping mid-field.
 *
 * @param {{ fields: { label: string, value: React.ReactNode, icon?: string }[] }} props
 */
export default function AccountDetails({ fields }) {
  const shown = fields.filter((field) => field.value !== null && field.value !== undefined && field.value !== '');
  if (shown.length === 0) return null;

  return (
    <dl className="account-details">
      {shown.map((field) => (
        <div key={field.label} className="account-details__field">
          <dt>
            {field.icon && <Icon name={field.icon} size={14} />}
            {field.label}
          </dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
