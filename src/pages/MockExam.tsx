import { MockSetup } from '@/components/mock/MockSetup';
import { MockSettings } from '@/types/mock';

export function MockExam() {
  const handleStartMock = (settings: MockSettings) => {
    console.log('Starting mock with settings:', settings);
    // TODO: Implement mock exam session
  };

  return <MockSetup onStart={handleStartMock} />;
}