import { BrandLogoTA, type BrandLogoTAProps } from '@/components/TA/BrandLogoTA';

// COMPONENT — compatibility entry point for existing views.
export const HabituLogo = ({ variant = 'icon', ...props }: BrandLogoTAProps) => (
  <BrandLogoTA variant={variant} {...props} />
);
