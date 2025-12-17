<script lang="ts">
  export let checked: boolean = false;
  export let onCheckedChange: ((checked: boolean) => void) | undefined = undefined;
  export let disabled: boolean = false;
  export let id: string | undefined = undefined;
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  {disabled}
  {id}
  class="switch-root"
  class:switch-checked={checked}
  class:switch-disabled={disabled}
  on:click={() => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  }}
>
  <span class="switch-thumb" />
</button>

<style>
  .switch-root {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    width: 44px;
    height: 24px;
    padding: 2px;
    border-radius: 9999px;
    background-color: var(--muted);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
    outline: none;
  }

  .switch-root:hover:not(.switch-disabled) {
    background-color: var(--border);
  }

  .switch-root:focus-visible {
    box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--primary);
  }

  .switch-checked {
    background-color: var(--primary);
    border-color: var(--primary);
  }

  .switch-checked:hover:not(.switch-disabled) {
    background-color: var(--primary);
    opacity: 0.9;
  }

  .switch-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .switch-thumb {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 9999px;
    background-color: var(--background);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
    transform: translateX(0);
  }

  .switch-checked .switch-thumb {
    transform: translateX(20px);
  }
</style>

