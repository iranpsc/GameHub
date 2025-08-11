<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('production')) {
            URL::forceScheme('https');

            $proto = strtolower((string) $request->header('X-Forwarded-Proto', ''));
            $isSecure = $request->isSecure() || $proto === 'https';

            if (! $isSecure) {
                return redirect()->secure($request->getRequestUri());
            }
        }

        return $next($request);
    }
}