import { Link, useParams } from 'react-router-dom';
import { ButtonTA } from '@/components/TA/ButtonTA';
import { StateTA } from '@/components/TA/StateTA';
import { ProfessionalsDirectoryTA } from '@/modules/professionals/ProfessionalsDirectoryTA';
import { ProfessionalDetailTA } from '@/modules/professionals/ProfessionalDetailTA';
import { ProfessionalFormTA } from '@/modules/professionals/ProfessionalFormTA';
import { ProfessionalAvailabilityTA } from '@/modules/professionals/ProfessionalAvailabilityTA';
import { ProfessionalRemovalTA } from '@/modules/professionals/ProfessionalRemovalTA';

// COMPONENT
export const AdminBarbersPage = () => {
  const params = useParams();
  const segments = (params['*'] ?? '').split('/').filter(Boolean);
  const [identifier, action] = segments;
  if (!identifier) return <ProfessionalsDirectoryTA />;
  if (identifier === 'new' && segments.length === 1) return <ProfessionalFormTA />;
  const id = Number(identifier);
  if (!Number.isSafeInteger(id) || id <= 0 || segments.length > 2 || (action && !['edit', 'availability', 'delete'].includes(action))) return <div><StateTA title="Vista no encontrada" description="Este enlace no corresponde a un profesional." /><ButtonTA  variant="outline" nativeButton={false} render={<Link to="/admin/professionals" />}> Volver al equipo</ButtonTA></div>;
  if (action === 'edit') return <ProfessionalFormTA key={id} id={id} />;
  if (action === 'availability') return <ProfessionalAvailabilityTA key={id} id={id} />;
  if (action === 'delete') return <ProfessionalRemovalTA key={id} id={id} />;
  return <ProfessionalDetailTA key={id} id={id} />;
};
