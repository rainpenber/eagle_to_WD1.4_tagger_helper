<script lang="ts">
  export let currentPage: number = 1;
  export let totalPages: number = 1;
  export let onPageChange: ((page: number) => void) | undefined = undefined;
  export let showFirstLast: boolean = true;
  export let maxVisible: number = 5;

  $: startPage = Math.max(1, Math.min(currentPage - Math.floor(maxVisible / 2), totalPages - maxVisible + 1));
  $: endPage = Math.min(totalPages, startPage + maxVisible - 1);
  $: pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && onPageChange) {
      onPageChange(page);
    }
  };
</script>

<nav class="pagination-nav" aria-label="分页导航">
  <ul class="pagination-list">
    {#if showFirstLast && currentPage > 1}
      <li>
        <button
          type="button"
          class="pagination-item pagination-first"
          on:click={() => handlePageClick(1)}
          aria-label="第一页"
        >
          首页
        </button>
      </li>
    {/if}
    {#if currentPage > 1}
      <li>
        <button
          type="button"
          class="pagination-item pagination-prev"
          on:click={() => handlePageClick(currentPage - 1)}
          aria-label="上一页"
        >
          ‹
        </button>
      </li>
    {/if}
    {#each pages as page}
      <li>
        <button
          type="button"
          class="pagination-item"
          class:pagination-active={page === currentPage}
          on:click={() => handlePageClick(page)}
          aria-label="第 {page} 页"
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      </li>
    {/each}
    {#if currentPage < totalPages}
      <li>
        <button
          type="button"
          class="pagination-item pagination-next"
          on:click={() => handlePageClick(currentPage + 1)}
          aria-label="下一页"
        >
          ›
        </button>
      </li>
    {/if}
    {#if showFirstLast && currentPage < totalPages}
      <li>
        <button
          type="button"
          class="pagination-item pagination-last"
          on:click={() => handlePageClick(totalPages)}
          aria-label="最后一页"
        >
          末页
        </button>
      </li>
    {/if}
  </ul>
</nav>

<style>
  .pagination-nav {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pagination-list {
    display: flex;
    align-items: center;
    gap: 4px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .pagination-item {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background-color: var(--card);
    color: var(--foreground);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
  }

  .pagination-item:hover:not(.pagination-active) {
    background-color: var(--muted);
    border-color: var(--primary);
  }

  .pagination-item:focus-visible {
    box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--primary);
  }

  .pagination-active {
    background-color: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }

  .pagination-first,
  .pagination-last {
    font-size: 13px;
  }

  .pagination-prev,
  .pagination-next {
    font-size: 18px;
    line-height: 1;
  }
</style>

