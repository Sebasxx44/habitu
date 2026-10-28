<?php

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

class CampaignHtmlService
{
    public function sanitize(string $html): string
    {
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,strong,b,em,i,u,s,h1,h2,h3,ul,ol,li,blockquote,a[href|title],img[src|alt|width|height]');
        $config->set('URI.AllowedSchemes', ['https' => true, 'http' => true, 'mailto' => true, 'data' => true]);
        $config->set('Cache.DefinitionImpl', null);
        return (new HTMLPurifier($config))->purify($html);
    }
}
