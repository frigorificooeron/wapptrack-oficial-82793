
import React from 'react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/MainLayout';
import CompanySettings from '@/components/settings/CompanySettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import MultipleInstancesSettings from '@/components/settings/MultipleInstancesSettings';
import FacebookMetaSettings from '@/components/settings/FacebookMetaSettings';
import { useSettings } from '@/hooks/useSettings';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const {
    loading,
    uploading,
    formData,
    handleInputChange,
    handleThemeChange,
    handleFileUpload,
    handleSave
  } = useSettings();

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as configurações da sua empresa e integrações
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="premium-button min-w-[140px]"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        <div className="grid gap-6">
          <CompanySettings
            formData={formData}
            uploading={uploading}
            onInputChange={handleInputChange}
            onFileUpload={handleFileUpload}
          />

          <ThemeSettings
            theme={formData.theme}
            onThemeChange={handleThemeChange}
          />

          <FacebookMetaSettings />

          <MultipleInstancesSettings />
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
