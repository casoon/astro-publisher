<script>
  import { onMount } from 'svelte';
  import ApiService from './lib/api/apiService';

  const api = new ApiService();

  let health = null;
  let user = null;
  let tenants = [];
  let selectedTenantId = '';
  let siteConfig = null;
  let posts = [];
  let validation = null;
  let loading = true;
  let loadingPosts = false;
  let error = '';

  let email = 'editor@example.com';
  let password = 'astro-demo-123';
  let tenantSlug = '';

  async function loadHealth() {
    health = await api.getHealth();
  }

  async function login() {
    error = '';
    validation = null;

    try {
      const result = await api.login({
        email,
        password,
        tenantSlug: tenantSlug || undefined,
      });

      user = result.user;
      selectedTenantId = result.tenant?.id ?? result.user.tenantId ?? '';
      api.setSession({ tenantId: selectedTenantId, authToken: result.token });

      await loadTenants();
      if (selectedTenantId) {
        await loadTenantDashboard(selectedTenantId);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login fehlgeschlagen.';
    }
  }

  async function loadTenants() {
    const result = await api.getTenants();
    tenants = result.tenants;

    if (!selectedTenantId && tenants.length > 0) {
      selectedTenantId = tenants[0].id;
    }
  }

  async function loadTenantDashboard(tenantId) {
    loadingPosts = true;
    validation = null;

    try {
      const [tenantResult, postsResult] = await Promise.all([
        api.getTenant(tenantId),
        api.getPosts(tenantId),
      ]);
      siteConfig = tenantResult.siteConfig;
      posts = postsResult.posts;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Tenant-Daten konnten nicht geladen werden.';
    } finally {
      loadingPosts = false;
    }
  }

  async function validateSelectedPost(postId) {
    if (!selectedTenantId) {
      return;
    }

    try {
      const result = await api.validatePost(selectedTenantId, postId);
      validation = result.validation;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Validierung fehlgeschlagen.';
    }
  }

  async function publishSelectedPost(postId) {
    if (!selectedTenantId) {
      return;
    }

    try {
      const result = await api.publishPost(selectedTenantId, postId);
      validation = result.validation;
      await loadTenantDashboard(selectedTenantId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Publish fehlgeschlagen.';
    }
  }

  onMount(async () => {
    try {
      await loadHealth();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Health-Check fehlgeschlagen.';
    } finally {
      loading = false;
    }
  });
</script>

<main class="layout">
  <section class="hero">
    <div>
      <p class="eyebrow">Astro Publisher</p>
      <h1>Tenant-sicheres Admin-MVP fuer strukturierte Astro-Inhalte</h1>
      <p class="lead">
        Das Frontend konzentriert sich auf den Kernworkflow: Login, Tenant-Auswahl, Post-Liste
        und Quality-Checks fuer strukturierte Blogbeitraege.
      </p>
    </div>

    <div class="health-card">
      <div class="health-label">API Health</div>
      {#if loading}
        <strong>Pruefe Verbindung ...</strong>
      {:else if health}
        <strong>{health.status}</strong>
        <span>{health.environment}</span>
        <span>{new Date(health.timestamp).toLocaleString()}</span>
      {:else}
        <strong>offline</strong>
      {/if}
    </div>
  </section>

  {#if error}
    <section class="notice error">{error}</section>
  {/if}

  <section class="panel">
    <div class="panel-header">
      <h2>Login</h2>
      <span>Einfaches MVP-Auth gegen Worker API</span>
    </div>

    <div class="form-grid">
      <label>
        <span>Tenant Slug</span>
        <input bind:value={tenantSlug} placeholder="kunde-a" />
      </label>
      <label>
        <span>E-Mail</span>
        <input bind:value={email} type="email" />
      </label>
      <label>
        <span>Passwort</span>
        <input bind:value={password} type="password" />
      </label>
      <button class="primary" on:click={login}>Login und Dashboard laden</button>
    </div>
  </section>

  {#if user}
    <section class="dashboard">
      <article class="panel">
        <div class="panel-header">
          <h2>Session</h2>
          <span>{user.role}</span>
        </div>
        <p><strong>{user.name}</strong> &lt;{user.email}&gt;</p>

        <label class="tenant-switcher">
          <span>Aktiver Tenant</span>
          <select
            bind:value={selectedTenantId}
            on:change={(event) => loadTenantDashboard(event.currentTarget.value)}
          >
            {#each tenants as tenant}
              <option value={tenant.id}>{tenant.name}</option>
            {/each}
          </select>
        </label>

        {#if siteConfig}
          <div class="meta-grid">
            <div>
              <span class="meta-label">Site Key</span>
              <strong>{siteConfig.siteKey}</strong>
            </div>
            <div>
              <span class="meta-label">Modell</span>
              <strong>{siteConfig.contentModelVersion}</strong>
            </div>
            <div>
              <span class="meta-label">Blocks</span>
              <strong>{siteConfig.allowedBlocks.join(', ')}</strong>
            </div>
          </div>
        {/if}
      </article>

      <article class="panel">
        <div class="panel-header">
          <h2>Posts</h2>
          <span>{posts.length} Eintraege</span>
        </div>

        {#if loadingPosts}
          <p class="muted">Lade Posts ...</p>
        {:else if posts.length === 0}
          <p class="muted">Keine Posts fuer den gewaehlten Tenant gefunden.</p>
        {:else}
          <div class="post-list">
            {#each posts as post}
              <div class="post-card">
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.slug}</p>
                  <span class:published={!post.draft}>{post.status}</span>
                </div>
                <div class="actions">
                  <button on:click={() => validateSelectedPost(post.id)}>Validieren</button>
                  <button class="primary" on:click={() => publishSelectedPost(post.id)}>Publish</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </article>

      <article class="panel">
        <div class="panel-header">
          <h2>Quality Engine</h2>
          <span>{validation ? (validation.valid ? 'valid' : 'needs work') : 'noch nicht ausgefuehrt'}</span>
        </div>

        {#if validation}
          <div class="validation-grid">
            <div>
              <h3>Fehler</h3>
              {#if validation.errors.length === 0}
                <p class="muted">Keine Fehler.</p>
              {:else}
                {#each validation.errors as issue}
                  <p class="issue error">{issue.message}</p>
                {/each}
              {/if}
            </div>
            <div>
              <h3>Warnungen</h3>
              {#if validation.warnings.length === 0}
                <p class="muted">Keine Warnungen.</p>
              {:else}
                {#each validation.warnings as issue}
                  <p class="issue warning">{issue.message}</p>
                {/each}
              {/if}
            </div>
          </div>
        {:else}
          <p class="muted">Waehle bei einem Post "Validieren", um das Regelwerk auszufuehren.</p>
        {/if}
      </article>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(248, 211, 126, 0.35), transparent 28%),
      linear-gradient(180deg, #f8f4ec 0%, #efe6da 100%);
    color: #1f2328;
  }

  .layout {
    max-width: 1180px;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
    gap: 1.5rem;
    align-items: start;
    margin-bottom: 1.5rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9c4f18;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  h1, h2, h3 {
    font-family: "Fraunces", Georgia, serif;
    margin: 0;
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3.75rem);
    line-height: 0.95;
    max-width: 12ch;
  }

  .lead {
    max-width: 58ch;
    color: #4d5358;
    font-size: 1.05rem;
    line-height: 1.6;
    margin-top: 1rem;
  }

  .health-card,
  .panel,
  .notice {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(31, 35, 40, 0.08);
    border-radius: 18px;
    backdrop-filter: blur(8px);
    box-shadow: 0 18px 40px rgba(70, 53, 30, 0.08);
  }

  .health-card {
    padding: 1.25rem;
    display: grid;
    gap: 0.45rem;
  }

  .health-label,
  .meta-label {
    color: #6e5a46;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .notice {
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }

  .notice.error,
  .issue.error {
    color: #912018;
    background: rgba(255, 231, 228, 0.9);
  }

  .issue.warning {
    color: #8c5a07;
    background: rgba(255, 243, 213, 0.9);
  }

  .panel {
    padding: 1.35rem;
  }

  .panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .panel-header span,
  .muted,
  .post-card p {
    color: #6a7075;
  }

  .form-grid,
  .dashboard {
    display: grid;
    gap: 1rem;
  }

  .dashboard {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 1rem;
  }

  label {
    display: grid;
    gap: 0.4rem;
    font-weight: 600;
  }

  input,
  select,
  button {
    font: inherit;
    border-radius: 12px;
    border: 1px solid rgba(31, 35, 40, 0.15);
    padding: 0.85rem 1rem;
    background: white;
  }

  button {
    cursor: pointer;
    font-weight: 700;
  }

  button.primary {
    background: #1b5e5a;
    color: white;
    border-color: #1b5e5a;
  }

  .tenant-switcher {
    margin-top: 1rem;
  }

  .meta-grid,
  .validation-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 1rem;
  }

  .validation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-list {
    display: grid;
    gap: 0.75rem;
  }

  .post-card {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border-radius: 14px;
    background: #fff8f0;
    border: 1px solid rgba(176, 110, 52, 0.12);
  }

  .post-card p {
    margin: 0.3rem 0 0.45rem;
  }

  .published {
    color: #1b5e5a;
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: 0.6rem;
  }

  .issue {
    border-radius: 12px;
    padding: 0.8rem 0.9rem;
    margin: 0 0 0.6rem;
  }

  @media (max-width: 960px) {
    .hero,
    .dashboard,
    .meta-grid,
    .validation-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
