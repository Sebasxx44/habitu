import { MessageCircle } from 'lucide-react'
import type { BookingAppointment } from '@/composables/booking/types'

export const WhatsAppButton = ({ phone, message = '' }: { phone?: string | null; message?: string }) => {
  const formattedPhone = phone?.replace(/\D/g, '') || ''
  const defaultMessage = message || 'Hola, quiero información sobre sus servicios.'
  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(defaultMessage)}`

  if (!formattedPhone) return null

  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] flex items-center justify-center shadow-lg hover:scale-110 transition-all"
      title="Contactar por WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
  )
}

export const WhatsAppNotification = ({ appointment }: { appointment?: BookingAppointment }) => {
  const phone = appointment?.client?.phone || ''
  const message = `Hola ${appointment?.client?.name}, te recordamos tu cita para ${appointment?.service?.name} el ${appointment?.date} a las ${appointment?.time}. Te esperamos!`

  return <WhatsAppButton phone={phone} message={message} />
}