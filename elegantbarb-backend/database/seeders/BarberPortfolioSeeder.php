<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Barber;
use App\Models\BarberPortfolio;
use App\Models\Client;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\Review;
use Carbon\Carbon;

class BarberPortfolioSeeder extends Seeder
{
    public function run(): void
    {
        // Professional barber profile photos
        $profilePhotos = [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
            'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&q=80',
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
            'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&q=80',
            'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
            'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
        ];

        // Haircut portfolio images
        $portfolioImages = [
            'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80',
            'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80',
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80',
            'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80',
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80',
            'https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=600&q=80',
            'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80',
            'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&q=80',
            'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&q=80',
            'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80',
            'https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?w=600&q=80',
            'https://images.unsplash.com/photo-1617896848219-5ec29f3314f1?w=600&q=80',
        ];

        $portfolioTitles = [
            ['title' => 'Fade Clásico', 'description' => 'Degradado limpio con acabado premium'],
            ['title' => 'Skin Fade', 'description' => 'Degradado al ras con línea definida'],
            ['title' => 'Pompadour Moderno', 'description' => 'Estilo retro con toque contemporáneo'],
            ['title' => 'Buzz Cut Texturizado', 'description' => 'Corte militar con textura sutil'],
            ['title' => 'Corte + Barba Full', 'description' => 'Servicio completo de transformación'],
            ['title' => 'Taper Fade', 'description' => 'Transición suave y elegante'],
            ['title' => 'Low Fade con Diseño', 'description' => 'Arte en cabello con líneas precisas'],
            ['title' => 'Mid Fade Texturizado', 'description' => 'Volumen natural con degradado medio'],
            ['title' => 'High Fade Ejecutivo', 'description' => 'Look profesional y pulido'],
            ['title' => 'Crop Top Moderno', 'description' => 'Flequillo texturizado con fade'],
            ['title' => 'Undercut Desconectado', 'description' => 'Contraste marcado y audaz'],
            ['title' => 'Corte Clásico Caballero', 'description' => 'Elegancia atemporal'],
        ];

        $specialties = [
            'Fade Specialist', 'Master Barber', 'Color Expert',
            'Beard Sculptor', 'Classic Cuts', 'Razor Artist',
            'Texture Pro', 'Style Consultant', 'Precision Barber',
        ];

        $barbers = Barber::with('barberShop')->get();
        $statuses = ['COMPLETADA', 'COMPLETADA', 'COMPLETADA', 'PENDIENTE', 'CANCELADA'];
        $payments = ['Tarjeta', 'Efectivo', 'Transferencia'];
        $hours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

        // --- 1. Update Services with Media and Categories ---
        $serviceMedia = [
            'Corte Moderno' => [
                'image' => 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80',
                'category' => 'Corte',
                'gallery' => [
                    ['url' => 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80', 'type' => 'image', 'caption' => 'Acabado lateral'],
                    ['url' => 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80', 'type' => 'image', 'caption' => 'Vista frontal']
                ]
            ],
            'Corte + Barba' => [
                'image' => 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80',
                'category' => 'Combo',
                'gallery' => [
                    ['url' => 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80', 'type' => 'image', 'caption' => 'Detalle de barba'],
                    ['url' => 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&q=80', 'type' => 'image', 'caption' => 'Perfilado completo']
                ]
            ],
            'Perfilado Premium' => [
                'image' => 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80',
                'category' => 'Barba',
                'gallery' => [
                    ['url' => 'https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?w=600&q=80', 'type' => 'image', 'caption' => 'Toalla caliente'],
                    ['url' => 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&q=80', 'type' => 'image', 'caption' => 'Navaja de precisión']
                ]
            ]
        ];

        $allServices = Service::all();
        foreach ($allServices as $svc) {
            if (isset($serviceMedia[$svc->name])) {
                $svc->update([
                    'image_url' => $serviceMedia[$svc->name]['image'],
                    'category' => $serviceMedia[$svc->name]['category'],
                    'media_gallery' => $serviceMedia[$svc->name]['gallery'],
                ]);
            } else {
                $svc->update([
                    'image_url' => 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80',
                    'category' => 'Otros',
                    'media_gallery' => []
                ]);
            }
        }

        foreach ($barbers as $index => $barber) {
            $shopId = $barber->barber_shop_id;

            // --- 2. Update profile photo, specialty, and bio ---
            $barber->update([
                'photo_url' => $profilePhotos[$index % count($profilePhotos)],
                'specialty' => $specialties[$index % count($specialties)],
                'bio' => $this->generateBio($barber->name),
            ]);

            // --- 3. Create portfolio items (5-8 per barber) ---
            BarberPortfolio::where('barber_id', $barber->id)->delete(); // clean slate
            $portfolioCount = rand(5, 8);
            $shuffledImages = range(0, count($portfolioImages) - 1);
            shuffle($shuffledImages);

            for ($i = 0; $i < $portfolioCount; $i++) {
                $imgIndex = $shuffledImages[$i % count($shuffledImages)];
                $titleData = $portfolioTitles[$imgIndex % count($portfolioTitles)];

                BarberPortfolio::create([
                    'barber_id' => $barber->id,
                    'image_url' => $portfolioImages[$imgIndex],
                    'title' => $titleData['title'],
                    'description' => $titleData['description'],
                ]);
            }

            // --- 4. Create appointments (15-25 per barber spread over last 60 days) ---
            $services = Service::where('barber_shop_id', $shopId)->get();
            $clients = Client::where('barber_shop_id', $shopId)->get();

            if ($services->isEmpty() || $clients->isEmpty()) {
                $this->command->warn("Skipping appointments for {$barber->name}: no services or clients found.");
                continue;
            }

            // Delete existing appointments to avoid duplicates on re-run
            Appointment::where('barber_id', $barber->id)->delete();

            $appointmentCount = rand(15, 25);
            for ($a = 0; $a < $appointmentCount; $a++) {
                $service = $services->random();
                $client = $clients->random();
                $status = $statuses[array_rand($statuses)];
                $date = Carbon::now()->subDays(rand(0, 60));
                $time = $hours[array_rand($hours)];

                $app = Appointment::create([
                    'barber_shop_id' => $shopId,
                    'barber_id' => $barber->id,
                    'client_id' => $client->id,
                    'service_id' => $service->id,
                    'date' => $date->format('Y-m-d'),
                    'time' => $time,
                    'status' => $status,
                    'price' => $service->price + rand(-5, 10),
                    'paid' => ($status === 'COMPLETADA') ? 1 : 0,
                    'payment_method' => $payments[array_rand($payments)],
                    'gallery' => [],
                ]);

                // Create a review for completed appointments (70% chance)
                if ($status === 'COMPLETADA' && rand(1, 10) <= 7) {
                    Review::create([
                        'barber_shop_id' => $shopId,
                        'client_id' => $client->id,
                        'rating' => rand(4, 5),
                        'comment' => $this->randomComment(),
                    ]);
                }
            }

            $this->command->info("✅ {$barber->name}: photo, {$portfolioCount} portfolio items, {$appointmentCount} appointments");
        }
    }

    private function generateBio(string $name): string
    {
        $bios = [
            "Con más de 7 años de experiencia, {$name} se especializa en cortes modernos y degradados de precisión. Su pasión por el detalle lo convierte en uno de los barberos más solicitados.",
            "{$name} combina técnicas clásicas europeas con las últimas tendencias urbanas. Formado en academias internacionales, cada corte es una obra de arte personalizada.",
            "Apasionado por la barbería desde los 16 años, {$name} ha perfeccionado su técnica trabajando en las mejores barberías de la ciudad.",
            "Artista del cabello y experto en transformaciones, {$name} cree que un buen corte puede cambiar la confianza de una persona.",
        ];
        return $bios[array_rand($bios)];
    }

    private function randomComment(): string
    {
        $comments = [
            'Excelente servicio y atención al detalle. Volveré sin duda.',
            'El mejor corte que me han hecho. Muy profesional.',
            'Increíble degradado, exactamente lo que pedí. Top.',
            'Servicio premium desde que entras. Ambiente espectacular.',
            'Muy buen trato y el resultado fue perfecto. Recomendado.',
            'La barba quedó impecable. Se nota la experiencia.',
            'Atención de primera, ambiente limpio y resultado genial.',
            'Me encantó el corte. Definitivamente mi barbero de confianza.',
        ];
        return $comments[array_rand($comments)];
    }
}
