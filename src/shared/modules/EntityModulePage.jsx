import { useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../components/ModulePageHeader';
import ModuleTabs from '../components/ModuleTabs';
import AppModal from '../components/AppModal';
import AppTable from '../components/AppTable';
import TableToolbar from '../components/TableToolbar';
import useModuleTab from '../hooks/useModuleTab';
import EntityForm from './EntityForm';
import StudentProfileOverview from '../../features/student-profile/components/StudentProfileOverview';
import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';
import {
  buildColumns,
  buildFieldDefinitions,
  cloneRecords,
  filterRecords,
  normalizeRecords,
} from './entityUtils';

function EntityModulePage({ module }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const allowedTabs = useMemo(() => module.tabs.map((tab) => tab.key), [module.tabs]);
  const { activeTab, setActiveTab } = useModuleTab(module.defaultTab, allowedTabs);

  const [recordsByTab, setRecordsByTab] = useState(() =>
    Object.fromEntries(module.tabs.map((tab) => [tab.key, cloneRecords(normalizeRecords(tab.records))]))
  );

  const [searchByTab, setSearchByTab] = useState(() => Object.fromEntries(module.tabs.map((tab) => [tab.key, ''])));
  const [modalState, setModalState] = useState({ isOpen: false, record: null });

  const activeTabConfig = useMemo(() => module.tabs.find((tab) => tab.key === activeTab) || module.tabs[0], [module.tabs, activeTab]);
  const activeRecords = recordsByTab[activeTab] || [];
  const activeFields = useMemo(() => buildFieldDefinitions(activeRecords, activeTabConfig.fields || []), [activeRecords, activeTabConfig]);
  const filteredRows = useMemo(() => filterRecords(activeRecords, searchByTab[activeTab]), [activeRecords, activeTab, searchByTab]);
  const isProfileCardMode = activeTabConfig.presentation === 'profile-card';
  const currentProfileRecord = activeRecords[0] || null;

  const closeModal = () => setModalState({ isOpen: false, record: null });

  useEffect(() => {
    closeModal();
  }, [activeTab]);

  const handleSave = (formData) => {
    setRecordsByTab((current) => {
      const nextRecords = [...(current[activeTab] || [])];

      if (isProfileCardMode) {
        if (nextRecords.length > 0) {
          return { ...current, [activeTab]: [{ ...nextRecords[0], ...formData }] };
        }
        return { ...current, [activeTab]: [{ id: 1, ...formData }] };
      }

      if (modalState.record) {
        return {
          ...current,
          [activeTab]: nextRecords.map((record) => (record.id === modalState.record.id ? { ...record, ...formData } : record)),
        };
      }

      const nextId = nextRecords.length > 0 ? Math.max(...nextRecords.map((record, index) => Number(record.id) || index + 1)) + 1 : 1;
      return { ...current, [activeTab]: [{ id: nextId, ...formData }, ...nextRecords] };
    });

    closeModal();
  };

  const handleDelete = (recordId) => {
    if (activeTabConfig.allowDelete === false) return;
    setRecordsByTab((current) => ({ ...current, [activeTab]: (current[activeTab] || []).filter((record) => record.id !== recordId) }));
  };

  const columns = useMemo(() => {
    const dataColumns = buildColumns(activeFields);
    if (isProfileCardMode) return dataColumns;

    return [
      ...dataColumns,
      {
        key: 'actions',
        label: 'Actions',
        headerClassName: 'text-end',
        cellClassName: 'text-end',
        render: (_, row) => (
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setModalState({ isOpen: true, record: row })}>
              {t('Edit')}
            </button>
            {activeTabConfig.allowDelete === false ? null : (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(row.id)}>
                {t('Delete')}
              </button>
            )}
          </div>
        ),
      },
    ];
  }, [activeFields, isProfileCardMode, activeTabConfig, isArabic]);

  const translatedTabLabel = t(activeTabConfig.label);
  const translatedModuleTitle = t(module.title);

  const headerAddLabel = isProfileCardMode
    ? currentProfileRecord
      ? (isArabic ? 'تعديل ملف الطالب' : 'Edit Student Profile')
      : (isArabic ? 'إنشاء ملف الطالب' : 'Create Student Profile')
    : activeTabConfig.addLabel || (isArabic ? `إضافة ${translatedTabLabel}` : `Add ${activeTabConfig.label}`);

  const headerAction = isProfileCardMode
    ? () => setModalState({ isOpen: true, record: currentProfileRecord })
    : activeTabConfig.allowCreate === false
      ? null
      : () => setModalState({ isOpen: true, record: null });

  return (
    <div>
      <ModulePageHeader title={module.title} description={module.description} addLabel={headerAddLabel} onAddClick={headerAction} />

      <ModuleTabs tabs={module.tabs} activeKey={activeTab} onChange={setActiveTab} />

      {isProfileCardMode ? (
        <StudentProfileOverview profile={currentProfileRecord} onEdit={() => setModalState({ isOpen: true, record: currentProfileRecord })} />
      ) : (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title={activeTabConfig.label}
              subtitle={activeTabConfig.subtitle || (isArabic ? `إدارة سجلات ${translatedTabLabel} ضمن وحدة ${translatedModuleTitle}.` : `Manage ${activeTabConfig.label} records within the ${module.title} module.`)}
              search={searchByTab[activeTab]}
              onSearchChange={(value) => setSearchByTab((current) => ({ ...current, [activeTab]: value }))}
              searchPlaceholder={isArabic ? `ابحث في ${translatedTabLabel}...` : `Search ${activeTabConfig.label}...`}
            />

            <AppTable columns={columns} rows={filteredRows} rowKey="id" emptyMessage={isArabic ? `لا توجد سجلات ${translatedTabLabel}.` : `No ${activeTabConfig.label} records found.`} />
          </div>
        </div>
      )}

      <AppModal
        isOpen={modalState.isOpen}
        title={modalState.record ? (isArabic ? `تعديل ${translatedTabLabel}` : `Edit ${activeTabConfig.label}`) : (isArabic ? `إضافة ${translatedTabLabel}` : `Add ${activeTabConfig.label}`)}
        onClose={closeModal}
      >
        <EntityForm entityName={activeTabConfig.label} fields={activeFields.filter((field) => field.key !== 'id')} selectedRecord={modalState.record} onSave={handleSave} onCancel={closeModal} />
      </AppModal>
    </div>
  );
}

export default EntityModulePage;
