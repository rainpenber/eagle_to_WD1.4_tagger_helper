<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let open: boolean = false;
  export let title: string = '';
  export let description: string = '';
  
  const dispatch = createEventDispatcher();
  
  const handleOpenChange = (newOpen: boolean) => {
    open = newOpen;
    dispatch('openChange', newOpen);
  };
  
  const handleCancel = () => {
    handleOpenChange(false);
    dispatch('cancel');
  };
  
  const handleConfirm = () => {
    handleOpenChange(false);
    dispatch('confirm');
  };
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="alert-dialog-overlay" role="presentation" on:click={handleCancel} on:keydown={(e) => e.key === 'Escape' && handleCancel()}>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="alert-dialog-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="alert-dialog-title">
      <div class="alert-dialog-header">
        <h2 id="alert-dialog-title" class="alert-dialog-title">{title}</h2>
        {#if description}
          <p class="alert-dialog-description">{description}</p>
        {/if}
      </div>
      <div class="alert-dialog-footer">
        <slot name="actions">
          <button class="btn" on:click={handleCancel}>取消</button>
          <button class="btn primary" on:click={handleConfirm}>确认</button>
        </slot>
      </div>
      <style>
        :global(.alert-dialog-actions) {
          width: 100%;
        }
      </style>
    </div>
  </div>
{/if}

<style>
  .alert-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }
  
  .alert-dialog-content {
    background-color: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    box-shadow: 0 10px 38px rgba(0, 0, 0, 0.35), 0 10px 20px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideIn 0.2s ease-out;
  }
  
  .alert-dialog-header {
    padding: 24px;
    border-bottom: 1px solid #333;
  }
  
  .alert-dialog-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #fff;
  }
  
  .alert-dialog-description {
    font-size: 14px;
    color: #999;
    margin: 0;
    line-height: 1.5;
  }
  
  .alert-dialog-footer {
    padding: 16px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid #333;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideIn {
    from {
      transform: translate(-50%, -48%) scale(0.96);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }
</style>

