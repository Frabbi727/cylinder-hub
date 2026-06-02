<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAccessToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $abilities = $request->user()?->currentAccessToken()?->abilities ?? [];

        if ($abilities === ['refresh']) {
            return response()->json([
                'success' => false,
                'message' => 'Access token required. Use POST /api/v1/auth/refresh to get a new access token.',
            ], 401);
        }

        return $next($request);
    }
}
