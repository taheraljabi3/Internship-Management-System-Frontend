import { useEffect, useState } from 'react';
import FormCard from '../forms/FormCard';
import FormField from '../forms/FormField';
import FormActions from '../forms/FormActions';
import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';
import { createInitialFormState, normalizeFormValue } from './entityUtils';

function EntityForm({ entityName, fields, selectedRecord, onSave, onCancel }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);
  const [form, setForm] = useState(() => createInitialFormState(fields, selectedRecord));

  useEffect(() => {
    setForm(createInitialFormState(fields, selectedRecord));
  }, [fields, selectedRecord]);

  const handleChange = (event, field) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field.key]: normalizeFormValue(field, value) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <FormCard title={selectedRecord ? (isArabic ? `تعديل ${t(entityName)}` : `Edit ${entityName}`) : (isArabic ? `إنشاء ${t(entityName)}` : `Create ${entityName}`)}>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {fields.map((field) => (
            <div key={field.key} className={field.type === 'textarea' ? 'col-12' : 'col-md-6'}>
              <FormField label={field.label}>
                {field.type === 'textarea' ? (
                  <textarea name={field.key} className="form-control" rows={field.rows} value={form[field.key] ?? ''} onChange={(event) => handleChange(event, field)} readOnly={field.readOnly} />
                ) : field.type === 'select' ? (
                  <select name={field.key} className="form-select" value={String(form[field.key] ?? '')} onChange={(event) => handleChange(event, field)} disabled={field.readOnly}>
                    {field.options?.map((option) => (
                      <option key={`${field.key}-${String(option.value)}`} value={String(option.value)}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name={field.key} type={field.type} step={field.step} className="form-control" value={form[field.key] ?? ''} onChange={(event) => handleChange(event, field)} readOnly={field.readOnly} />
                )}
              </FormField>
            </div>
          ))}
        </div>

        <FormActions>
          <button type="submit" className="btn btn-primary">{selectedRecord ? (isArabic ? `تحديث ${t(entityName)}` : `Update ${entityName}`) : (isArabic ? `إضافة ${t(entityName)}` : `Add ${entityName}`)}</button>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
        </FormActions>
      </form>
    </FormCard>
  );
}

export default EntityForm;
