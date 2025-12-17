<script lang="ts">
  export let message: string = '';
  export let visible: boolean = false;
  export let type: 'info' | 'loading' | 'success' | 'error' = 'info';
  export let duration: number = 3000; // 默认3秒，loading类型不自动关闭

  let timeoutId: any = null;

  $: if (visible && type !== 'loading') {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      visible = false;
    }, duration);
  }

  $: if (!visible && timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
</script>

{#if visible}
  <div class="toast toast-{type}">
    {#if type === 'loading'}
      <div class="toast-spinner"></div>
    {/if}
    <span class="toast-message">{message}</span>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 200px;
    max-width: 400px;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .toast-loading {
    border-color: var(--primary);
  }

  .toast-success {
    border-color: var(--success);
  }

  .toast-error {
    border-color: var(--danger);
  }

  .toast-info {
    border-color: var(--primary);
  }

  .toast-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .toast-message {
    font-size: 14px;
    color: var(--foreground);
    flex: 1;
  }
</style>


