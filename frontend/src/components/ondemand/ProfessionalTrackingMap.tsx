import { HomeServiceMapTA } from '@/modules/home-service/components/HomeServiceMapTA';
import { homeServicePoint } from '@/modules/home-service/helpers';

// TYPES
interface ProfessionalTrackingMapProps {
  clientLat: number;
  clientLng: number;
  profLat: number;
  profLng: number;
  status: string;
  className?: string;
}

// COMPONENT
export const ProfessionalTrackingMap = ({ clientLat, clientLng, profLat, profLng, status, className }: ProfessionalTrackingMapProps) => <HomeServiceMapTA point={homeServicePoint(clientLat, clientLng)} professional={['ON_THE_WAY', 'IN_PROGRESS'].includes(status) ? homeServicePoint(profLat, profLng) : null} className={className} />;
