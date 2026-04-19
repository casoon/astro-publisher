import type {
  AuthUser,
  Post,
  SiteConfig,
  Tenant,
  ValidationResult,
} from '@astro-publisher/core';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface ApiOptions {
  tenantId?: string;
  authToken?: string;
}

interface LoginPayload {
  tenantSlug?: string;
  email: string;
  password: string;
}

class ApiService {
  private baseUrl: string;
  private tenantId?: string;
  private authToken?: string;

  constructor(options: ApiOptions = {}) {
    this.baseUrl = API_BASE_URL;
    this.tenantId = options.tenantId;
    this.authToken = options.authToken;
  }

  setSession(options: ApiOptions) {
    this.tenantId = options.tenantId;
    this.authToken = options.authToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (this.tenantId) {
      headers.set('x-tenant-id', this.tenantId);
    }

    if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `API Error ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async getHealth() {
    return this.request<{ status: string; timestamp: string; environment: string }>('/api/health');
  }

  async login(payload: LoginPayload) {
    return this.request<{ token: string; user: AuthUser; tenant: Tenant | null }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMe() {
    return this.request<{ user: AuthUser; tenant: Tenant | null }>('/api/me');
  }

  async getTenants() {
    return this.request<{ tenants: Tenant[] }>('/api/tenants');
  }

  async getTenant(tenantId: string) {
    return this.request<{ tenant: Tenant; siteConfig: SiteConfig | null }>(`/api/tenants/${tenantId}`);
  }

  async getPosts(tenantId: string) {
    return this.request<{ posts: Post[] }>(`/api/tenants/${tenantId}/posts`);
  }

  async getPost(tenantId: string, postId: string) {
    return this.request<{ post: Post }>(`/api/tenants/${tenantId}/posts/${postId}`);
  }

  async validatePost(tenantId: string, postId: string) {
    return this.request<{ validation: ValidationResult }>(
      `/api/tenants/${tenantId}/posts/${postId}/validate`,
      { method: 'POST' },
    );
  }

  async publishPost(tenantId: string, postId: string) {
    return this.request<{ post: Post; validation: ValidationResult }>(
      `/api/tenants/${tenantId}/posts/${postId}/publish`,
      { method: 'POST' },
    );
  }
}

export default ApiService;
