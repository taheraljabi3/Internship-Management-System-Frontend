import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function getStatusClass(value = '') {
  const normalized = String(value).trim().toLowerCase();

  const map = {
    active: 'ims-status-active',
    approved: 'ims-status-approved',
    open: 'ims-status-open',
    reviewed: 'ims-status-reviewed',
    completed: 'ims-status-completed',
    generated: 'ims-status-generated',
    submitted: 'ims-status-submitted',
    present: 'ims-status-active',
    pending: 'ims-status-pending',
    'under review': 'ims-status-under-review',
    scheduled: 'ims-status-scheduled',
    planned: 'ims-status-planned',
    inactive: 'ims-status-inactive',
    closed: 'ims-status-closed',
    absent: 'ims-status-absent',
  };

  return map[normalized] || 'ims-status-inactive';
}

function AppTable({ columns = [], rows = [], rowKey = 'id', emptyMessage = 'No records found.' }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="table-responsive">
      <table className="table ims-table align-middle">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.headerClassName || ''}>
                {t(column.label)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((column) => {
                  const value = row[column.key];

                  if (column.render) {
                    return (
                      <td key={column.key} className={column.cellClassName || ''}>
                        {column.render(value, row)}
                      </td>
                    );
                  }

                  if (column.type === 'status') {
                    return (
                      <td key={column.key} className={column.cellClassName || ''}>
                        <span className={`ims-status-badge ${getStatusClass(value)}`}>
                          {t(value)}
                        </span>
                      </td>
                    );
                  }

                  return (
                    <td key={column.key} className={column.cellClassName || ''}>
                      {typeof value === 'string' ? t(value) : value}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="ims-table-empty">
                {t(emptyMessage)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AppTable;
