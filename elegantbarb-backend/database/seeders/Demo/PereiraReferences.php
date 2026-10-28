<?php

namespace Database\Seeders\Demo;

/**
 * Public establishment references consulted on 2026-10-03; no personal employee data.
 * Only names, business categories and public areas are factual. Coordinates below are
 * hand-rounded AREA CENTRES for the demo map, NOT surveyed entrances or navigation data.
 * Photos, reviews, prices and calendars from these sites are deliberately not imported.
 */
final class PereiraReferences
{
    public static function businesses(): array
    {
        return [
            ['key' => 'fenix', 'name' => 'Fenix Barbershop', 'profile' => 'barber',
                'source' => 'https://www.fenixbarbershop.com/',
                'branches' => [['San Jorge', 'Barrio San Jorge, Pereira', 4.804, -75.710]]],
            ['key' => 'figaro', 'name' => 'Fígaro Pereira', 'profile' => 'barber',
                'source' => 'https://www.figarocolombia.com/en/sedes',
                'location_source' => 'https://web.bewe.co/circunvalar',
                'branches' => [['Circunvalar', 'Sector avenida Circunvalar, carrera 13 con calle 13, Pereira', 4.807, -75.686]]],
            ['key' => 'italiss', 'name' => 'Italiss Hair Salon Studio', 'profile' => 'hair',
                'source' => 'https://italisspeluqueria.com/',
                'branches' => [['Circunvalar', 'Sector calle 13 con carrera 12, Pereira', 4.808, -75.687]]],
            ['key' => 'chic-in', 'name' => 'Chic in', 'profile' => 'nails',
                'source' => 'https://chicin.com.co/salon-de-unas-en-pereira/',
                'branches' => [['Circunvalar', 'Sector avenida Circunvalar con calle 8, Pereira', 4.805, -75.681]]],
            ['key' => 'corpofacial', 'name' => 'Corpofacial', 'profile' => 'spa',
                'source' => 'https://corpofacial.com/category/todos-los-servicios/?e-filter-4027af9-category=relajacion-spa',
                'branches' => [['Centro', 'Sector carrera 3B con calle 26, Centro, Pereira', 4.819, -75.697]]],
            ['key' => 'bosque-secreto', 'name' => 'Bosque Secreto Ecolodge · Spa', 'profile' => 'spa',
                'source' => 'https://www.bosquesecreto.com.co/spa.html',
                'location_source' => 'https://bosquesecreto.com.co/faq.html',
                'branches' => [['Altagracia', 'Zona rural La Gramínea–Altagracia, Pereira', 4.736, -75.720]]],
            ['key' => 'smart-fit', 'name' => 'Smart Fit La 14 de Pereira', 'profile' => 'fitness',
                'source' => 'https://www.smartfit.com.co/sedes/la-14-de-pereira',
                'branches' => [['La 14', 'Sector calle 17 con carrera 19, Pereira', 4.804, -75.696]]],
            ['key' => 'comfamiliar', 'name' => 'Gimnasios Comfamiliar', 'profile' => 'fitness',
                'source' => 'https://comfamiliar.com/programas-de-salud/gimnasios-comfamiliar/',
                'branches' => [['Centro', 'Sector calle 22 con carrera 4, Pereira', 4.817, -75.693]]],
            ['key' => 'cardiofisica', 'name' => 'Cardiofísica', 'profile' => 'physio',
                'source' => 'https://cardiofisica.com/',
                'branches' => [['Pinares', 'Sector Megacentro Pinares, Pereira', 4.799, -75.683]]],
            ['key' => 'kinetika', 'name' => 'Kinetika Rehabilitación', 'profile' => 'physio',
                'source' => 'https://kinetikarehabilitacion.com/',
                'branches' => [['Circunvalar', 'Sector carrera 12 bis con calle 12, Pereira', 4.807, -75.685]]],
            ['key' => 'apaes', 'name' => 'APAES Pereira', 'profile' => 'physio',
                'source' => 'https://apaesvirtual.com/sedes/',
                'branches' => [
                    ['Álamos', 'Sector calle 14 con carrera 26, Álamos, Pereira', 4.791, -75.690],
                    ['Clínica Risaralda', 'Sector calle 19 con carrera 5, Centro, Pereira', 4.815, -75.691],
                ]],
            ['key' => 'dentix', 'name' => 'Dentix Pereira Centro', 'profile' => 'dental',
                'source' => 'https://www.clinicasdentix.com/pereira-clinica-dental',
                'branches' => [['Centro', 'Sector calle 19 bis con carrera 10, Pereira', 4.812, -75.696]]],
        ];
    }

    /** All service names, tariffs, durations, staff specialties and hours are fictional fixtures. */
    public static function profiles(): array
    {
        return [
            'barber' => ['category' => ['barberia', 'Barbería', 'Scissors', '#087F70'], 'specialty' => 'Corte y barba',
                'services' => [['Corte clásico', 28000, 30], ['Corte degradado', 35000, 45], ['Diseño de barba', 22000, 30], ['Corte y barba', 50000, 60]]],
            'hair' => ['category' => ['beauty-salon', 'Salón de Belleza', 'Sparkles', '#B65C84'], 'specialty' => 'Estilismo y cuidado capilar',
                'services' => [['Corte y asesoría de estilo', 55000, 45], ['Cepillado', 40000, 45], ['Tratamiento capilar', 80000, 60], ['Sesión de color', 140000, 90]]],
            'nails' => ['category' => ['nail-salon', 'Uñas y manos', 'Hand', '#BA668E'], 'specialty' => 'Manicure y pedicure',
                'services' => [['Manicure tradicional', 32000, 45], ['Manicure semipermanente', 58000, 60], ['Pedicure de cuidado', 42000, 45], ['Manicure y pedicure', 70000, 90]]],
            'spa' => ['category' => ['spa', 'Spa', 'Droplets', '#8268A6'], 'specialty' => 'Bienestar y relajación',
                'services' => [['Masaje relajante', 110000, 60], ['Sesión de bienestar facial', 85000, 60], ['Ritual de relajación', 150000, 90], ['Masaje focalizado', 65000, 30]]],
            'fitness' => ['category' => ['gym', 'Gimnasio', 'Dumbbell', '#467AA4'], 'specialty' => 'Entrenamiento físico',
                'services' => [['Entrenamiento personalizado', 45000, 60], ['Entrenamiento funcional', 35000, 45], ['Movilidad guiada', 30000, 45], ['Evaluación física inicial', 55000, 60]]],
            'physio' => ['category' => ['clinica-terapia', 'Clínica / Terapia', 'HeartPulse', '#21897E'], 'specialty' => 'Fisioterapia',
                'services' => [['Valoración de fisioterapia', 80000, 60], ['Sesión de fisioterapia', 65000, 45], ['Movilidad y equilibrio', 55000, 45], ['Seguimiento de rehabilitación', 60000, 30]]],
            'dental' => ['category' => ['odontologia', 'Odontología', 'Stethoscope', '#347F9F'], 'specialty' => 'Odontología general',
                'services' => [['Valoración odontológica', 65000, 45], ['Higiene dental', 95000, 60], ['Control preventivo', 55000, 30], ['Asesoría de cuidado oral', 45000, 30]]],
        ];
    }
}
