import { it, expect } from 'vitest';
import { validateProfileImageUrl } from './accountProfile';
import { parseImageUploadPath } from '../store/media';
async function validate() { return validateProfileImageUrl; }
const base='https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/';
it('accepts only canonical Supabase profile images owned by the account',async()=>{ const fn=await validate(); expect(fn('alice',base+'profile-images/alice/a.png')).toBe(base+'profile-images/alice/a.png'); for(const path of ['profile-images/victim/a.png','chat/alice/shared/2026-10/a.png','profile-images/alice/a.svg','profile-images/alice/a.png?download=1','profile-images/alice/a%2f.png']) expect(()=>fn('alice',base+path)).toThrow(); });
it('authorizes a profile path only for its owner',()=>{ expect(parseImageUploadPath('profile-images/alice/a.png','alice')).toEqual({path:'profile-images/alice/a.png'}); expect(()=>parseImageUploadPath('profile-images/victim/a.png','alice')).toThrow(); });
