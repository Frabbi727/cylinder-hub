<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        return $this->issueTokenPair(Auth::user(), 'Login successful.');
    }

    public function refresh(Request $request): JsonResponse
    {
        $abilities = $request->user()->currentAccessToken()->abilities ?? [];

        if (! in_array('refresh', $abilities)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid token type. Send your refresh token to this endpoint.',
            ], 401);
        }

        // Revoke all existing tokens before issuing fresh pair
        $request->user()->tokens()->delete();

        return $this->issueTokenPair($request->user(), 'Token refreshed.');
    }

    public function logout(Request $request): JsonResponse
    {
        // Revoke all tokens so both access and refresh become invalid
        $request->user()->tokens()->delete();
        return $this->deleted('Logged out successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        $user        = $request->user();
        $unreadCount = AppNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return $this->success(array_merge(
            $this->userPayload($user),
            ['unread_notifications' => $unreadCount]
        ));
    }

    private function issueTokenPair(User $user, string $message): JsonResponse
    {
        $accessTtl  = (int) env('ACCESS_TOKEN_TTL',  1440);   // minutes  — default 24 h
        $refreshTtl = (int) env('REFRESH_TOKEN_TTL', 43200);  // minutes  — default 30 days

        $access  = $user->createToken('access-token',  ['*'],       now()->addMinutes($accessTtl));
        $refresh = $user->createToken('refresh-token', ['refresh'], now()->addMinutes($refreshTtl));

        return $this->success([
            'user'          => $this->userPayload($user),
            'access_token'  => $access->plainTextToken,
            'refresh_token' => $refresh->plainTextToken,
            'token_type'    => 'Bearer',
            'expires_in'    => $accessTtl * 60,  // seconds — useful for mobile timer
        ], $message);
    }

    private function userPayload(User $user): array
    {
        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'phone'          => $user->phone,
            'role'           => $user->role,
            'avatar_initials'=> $user->avatar_initials,
        ];
    }
}
