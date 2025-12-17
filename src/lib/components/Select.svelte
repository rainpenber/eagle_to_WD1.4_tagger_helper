<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let value: string = '';
  export let options: Array<{ value: string; label: string }> = [];
  export let placeholder: string = '请选择...';
  export let disabled: boolean = false;
  export let id: string | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  let open = false;
  let selectEl: HTMLDivElement;
  
  const handleSelect = (optionValue: string) => {
    value = optionValue;
    open = false;
    dispatch('change', optionValue);
  };
  
  const handleClickOutside = (e: MouseEvent) => {
    if (selectEl && !selectEl.contains(e.target as Node)) {
      open = false;
    }
  };
  
  $: if (open) {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, 0);
  }
  
  $: selectedLabel = options.find(opt => opt.value === value)?.label || value || placeholder;
</script>

<div class="select-root" bind:this={selectEl}>
  <button
    type="button"
    class="select-trigger"
    class:select-disabled={disabled}
    aria-expanded={open}
    {disabled}
    {id}
    on:click={() => !disabled && (open = !open)}
    on:keydown={(e) => {
      if (e.key === 'Escape') open = false;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!disabled) open = !open;
      }
    }}
  >
    <span class:select-placeholder={!value}>{selectedLabel}</span>
    <svg class="select-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M4 6H11L7.5 10.5L4 6Z" fill="currentColor" />
    </svg>
  </button>
  
  {#if open && !disabled}
    <div class="select-content">
      {#each options as option}
        <button
          type="button"
          class="select-item"
          class:select-item-selected={option.value === value}
          on:click={() => handleSelect(option.value)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .select-root {
    position: relative;
    width: 100%;
  }
  
  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    background-color: #1e1e1e;
    border: 1px solid #333;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .select-trigger:hover:not(.select-disabled) {
    border-color: #555;
    background-color: #252525;
  }
  
  .select-trigger:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  .select-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .select-placeholder {
    color: #666;
  }
  
  .select-icon {
    color: #999;
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  
  .select-trigger[aria-expanded="true"] .select-icon {
    transform: rotate(180deg);
  }
  
  .select-content {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    margin-top: 4px;
    background-color: #1e1e1e;
    border: 1px solid #333;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-height: 300px;
    overflow-y: auto;
    animation: slideDown 0.2s ease-out;
  }
  
  .select-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  
  .select-item:hover {
    background-color: #252525;
  }
  
  .select-item-selected {
    background-color: #3b82f6;
    color: #fff;
  }
  
  .select-item-selected:hover {
    background-color: #2563eb;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

