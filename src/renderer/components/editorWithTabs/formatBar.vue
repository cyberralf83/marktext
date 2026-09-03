<template>
  <div class="format-bar">
    <div class="format-bar-inner">
      <!-- Heading dropdown -->
      <div class="heading-dropdown" ref="headingDropdown">
        <button
          class="format-btn heading-trigger"
          title="Heading Level"
          @click="toggleHeadingMenu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M3 3v12h2V10h5v5h2V3h-2v5H5V3H3z"/><path d="M14.5 8l2 2.5h-1.5V14h-1v-3.5H12.5L14.5 8z"/></svg>
          <svg class="dropdown-arrow" width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M1.5 3L4 5.5 6.5 3"/></svg>
        </button>
        <div v-show="headingMenuOpen" class="heading-menu">
          <button
            v-for="h in headings"
            :key="h.type"
            class="heading-option"
            :title="h.shortcut"
            @click="selectHeading(h)"
          >
            <span :style="{ fontSize: h.size + 'px', fontWeight: 600 }">{{ h.label }}</span>
          </button>
          <div class="heading-menu-divider"></div>
          <button class="heading-option" title="Increase heading level" @click="handleParagraph('upgrade heading')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 2L3 6h3v6h2V6h3L7 2z"/></svg>
            <span>Promote</span>
          </button>
          <button class="heading-option" title="Decrease heading level" @click="handleParagraph('degrade heading')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 12l4-4H8V2H6v6H3l4 4z"/></svg>
            <span>Demote</span>
          </button>
        </div>
      </div>

      <span class="separator"></span>

      <!-- Inline formatting -->
      <button
        v-for="item in inlineGroup"
        :key="item.type"
        class="format-btn"
        :class="{ active: isActive(item.type) }"
        :title="item.shortcut ? `${item.tooltip} (${item.shortcut})` : item.tooltip"
        @click="handleFormat(item.type)"
        v-html="item.svg"
      ></button>

      <span class="separator"></span>

      <!-- Links & media -->
      <button
        v-for="item in linkGroup"
        :key="item.type"
        class="format-btn"
        :class="{ active: isActive(item.type) }"
        :title="item.shortcut ? `${item.tooltip} (${item.shortcut})` : item.tooltip"
        @click="handleFormat(item.type)"
        v-html="item.svg"
      ></button>

      <span class="separator"></span>

      <!-- Lists -->
      <button
        v-for="item in listGroup"
        :key="item.type"
        class="format-btn"
        :title="item.tooltip"
        @click="handleParagraph(item.type)"
        v-html="item.svg"
      ></button>

      <span class="separator"></span>

      <!-- Blocks -->
      <button
        v-for="item in blockGroup"
        :key="item.type"
        class="format-btn"
        :title="item.shortcut ? `${item.tooltip} (${item.shortcut})` : item.tooltip"
        @click="handleParagraph(item.type)"
        v-html="item.svg"
      ></button>

      <span class="separator"></span>

      <!-- Misc -->
      <button
        v-for="item in miscGroup"
        :key="item.event + '-' + item.type"
        class="format-btn"
        :title="item.shortcut ? `${item.tooltip} (${item.shortcut})` : item.tooltip"
        @click="item.event === 'format' ? handleFormat(item.type) : handleParagraph(item.type)"
        v-html="item.svg"
      ></button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '@/bus'
import { isOsx } from 'muya/lib/config'

const CK = isOsx ? '⌘' : 'Ctrl'

// All icons as clean SVGs at 16x16 with consistent 1.5px stroke weight
const svg = {
  bold: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.5h4.75a3.25 3.25 0 0 1 2.15 5.7A3.25 3.25 0 0 1 9 14.5H3.5V1.5zm2 5.25H8a1.25 1.25 0 1 0 0-2.5H5.5v2.5zm0 2v3H9a1.5 1.5 0 0 0 0-3H5.5z"/></svg>',
  italic: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 1.5h6v2h-2.2L7.7 12.5H10v2H4v-2h2.2l2.6-9H6.5v-2z"/></svg>',
  underline: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.5v5.5a4.5 4.5 0 0 0 9 0V1.5h-2v5.5a2.5 2.5 0 0 1-5 0V1.5h-2zM3 13.5h10v1.5H3v-1.5z"/></svg>',
  strike: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 7.5h12V9H2V7.5z"/><path d="M5 4.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5h-2c0-.5-.4-1-1-1s-1 .5-1 1 .4.8 1 1h-1.7c-.8-.5-1.3-1.2-1.3-2zm1.3 5H8c.6.2 1 .6 1 1s-.4 1-1 1-1-.5-1-1H5c0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5c0-.7-.3-1.3-.9-1.7h-1.4c.5.3.8.7.8 1.2"/></svg>',
  highlight: '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1.5" y="12" width="13" height="3" rx="0.5" fill="currentColor" opacity="0.35"/><path d="M3 10l1.8-7h2l1.5 5.5h.1L10 3h2l1.8 7h-1.9l-1-4.5h-.1L9.3 10H7.5l-1.6-4.5H5.8L4.8 10H3z" fill="currentColor"/></svg>',
  superscript: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 14l3.8-5.2L1.2 3.5h2.5l2.1 3 2.1-3h2.5L6.8 8.8 10.5 14H8l-2.1-3L3.8 14H1z"/><path d="M12 3.5v-.5c0-.6.5-1.1 1.1-1.1h.4c.6 0 1.1.5 1.1 1.1 0 .3-.1.6-.4.8L12.5 5H15v1h-3V3.5z"/></svg>',
  subscript: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 14l3.8-5.2L1.2 3.5h2.5l2.1 3 2.1-3h2.5L6.8 8.8 10.5 14H8l-2.1-3L3.8 14H1z"/><path d="M12 12.5v-.5c0-.6.5-1.1 1.1-1.1h.4c.6 0 1.1.5 1.1 1.1 0 .3-.1.6-.4.8l-1.7 1.2H15v1h-3v-2.5z"/></svg>',
  code: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4L1.5 8 5 12"/><path d="M11 4l3.5 4L11 12"/></svg>',
  math: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2L8 8l-3.5 6h2.3L10 8 6.8 2H4.5zm4 0L12 8l-3.5 6h2.3L14 8l-3.2-6H8.5z" opacity="0.85"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6.8 9.2a3 3 0 0 0 4.24 0l2.12-2.12a3 3 0 0 0-4.24-4.24L7.5 4.28"/><path d="M9.2 6.8a3 3 0 0 0-4.24 0L2.84 8.92a3 3 0 0 0 4.24 4.24L8.5 11.72"/></svg>',
  image: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><circle cx="5" cy="6" r="1.3" fill="currentColor" stroke="none"/><path d="M1.5 12l3-3.5 2.5 3L10.5 7 14.5 12" stroke-linejoin="round"/></svg>',
  bulletList: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="2.5" cy="4" r="1.3"/><circle cx="2.5" cy="8" r="1.3"/><circle cx="2.5" cy="12" r="1.3"/><rect x="6" y="3" width="8.5" height="2" rx="0.5"/><rect x="6" y="7" width="8.5" height="2" rx="0.5"/><rect x="6" y="11" width="8.5" height="2" rx="0.5"/></svg>',
  orderedList: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><text x="0.5" y="5.5" font-size="5.5" font-weight="700" font-family="system-ui, sans-serif">1.</text><text x="0.5" y="9.5" font-size="5.5" font-weight="700" font-family="system-ui, sans-serif">2.</text><text x="0.5" y="13.5" font-size="5.5" font-weight="700" font-family="system-ui, sans-serif">3.</text><rect x="6" y="3" width="8.5" height="2" rx="0.5"/><rect x="6" y="7" width="8.5" height="2" rx="0.5"/><rect x="6" y="11" width="8.5" height="2" rx="0.5"/></svg>',
  taskList: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="2.5" width="5" height="5" rx="1"/><path d="M2.5 5l1.2 1.2L6 3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="9.5" width="5" height="5" rx="1"/><rect x="8" y="4" width="7" height="1.8" rx="0.4" fill="currentColor" stroke="none"/><rect x="8" y="11" width="7" height="1.8" rx="0.4" fill="currentColor" stroke="none"/></svg>',
  table: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><line x1="1.5" y1="6" x2="14.5" y2="6"/><line x1="1.5" y1="10" x2="14.5" y2="10"/><line x1="6" y1="2.5" x2="6" y2="13.5"/><line x1="10.5" y1="2.5" x2="10.5" y2="13.5"/></svg>',
  quote: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h3c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H5v1c0 .6.4 1 1 1v2c-1.7 0-3-1.3-3-3V3zm7 0h3c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-1v1c0 .6.4 1 1 1v2c-1.7 0-3-1.3-3-3V3z"/></svg>',
  codeBlock: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M5.5 6L3.5 8l2 2"/><path d="M10.5 6l2 2-2 2"/><line x1="9" y1="4.5" x2="7" y2="11.5"/></svg>',
  mathBlock: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M5.5 5l2 3-2 3"/><line x1="9" y1="5.5" x2="12" y2="5.5"/><line x1="9" y1="8" x2="11" y2="8"/><line x1="9" y1="10.5" x2="12" y2="10.5"/></svg>',
  html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3L1.5 8 5 13"/><path d="M11 3l3.5 5L11 13"/><line x1="9.5" y1="2" x2="6.5" y2="14"/></svg>',
  hr: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="7" width="14" height="2" rx="1"/></svg>',
  frontMatter: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="1" width="11" height="14" rx="1.5"/><line x1="5" y1="4.5" x2="11" y2="4.5"/><line x1="5" y1="7.5" x2="9.5" y2="7.5"/><line x1="5" y1="10.5" x2="10" y2="10.5"/></svg>',
  clearFormat: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h5.5L6 10.5h2.5L11 2h2.5v1L9.5 12H6L2.5 12V2H3z" opacity="0.4"/><line x1="2.5" y1="13.5" x2="13.5" y2="2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
}

export default {
  data () {
    return {
      headingMenuOpen: false,
      headings: [
        { type: 'heading 1', label: 'Heading 1', shortcut: `${CK}+1`, size: 16 },
        { type: 'heading 2', label: 'Heading 2', shortcut: `${CK}+2`, size: 14 },
        { type: 'heading 3', label: 'Heading 3', shortcut: `${CK}+3`, size: 13 },
        { type: 'heading 4', label: 'Heading 4', shortcut: `${CK}+4`, size: 12 },
        { type: 'heading 5', label: 'Heading 5', shortcut: `${CK}+5`, size: 11 },
        { type: 'heading 6', label: 'Heading 6', shortcut: `${CK}+6`, size: 10 },
        { type: 'paragraph', label: 'Paragraph', shortcut: '', size: 12 }
      ],
      inlineGroup: [
        { type: 'strong', tooltip: 'Bold', shortcut: `${CK}+B`, svg: svg.bold },
        { type: 'em', tooltip: 'Italic', shortcut: `${CK}+I`, svg: svg.italic },
        { type: 'u', tooltip: 'Underline', shortcut: `${CK}+U`, svg: svg.underline },
        { type: 'del', tooltip: 'Strikethrough', shortcut: `${CK}+D`, svg: svg.strike },
        { type: 'mark', tooltip: 'Highlight', shortcut: `⇧+${CK}+H`, svg: svg.highlight },
        { type: 'sup', tooltip: 'Superscript', shortcut: '', svg: svg.superscript },
        { type: 'sub', tooltip: 'Subscript', shortcut: '', svg: svg.subscript }
      ],
      linkGroup: [
        { type: 'inline_code', tooltip: 'Inline Code', shortcut: `${CK}+\``, svg: svg.code },
        { type: 'inline_math', tooltip: 'Inline Math', shortcut: `⇧+${CK}+M`, svg: svg.math },
        { type: 'link', tooltip: 'Link', shortcut: `${CK}+L`, svg: svg.link },
        { type: 'image', tooltip: 'Image', shortcut: `⇧+${CK}+I`, svg: svg.image }
      ],
      listGroup: [
        { type: 'ul-bullet', tooltip: 'Bullet List', svg: svg.bulletList },
        { type: 'ol-bullet', tooltip: 'Ordered List', svg: svg.orderedList },
        { type: 'ul-task', tooltip: 'Task List', svg: svg.taskList }
      ],
      blockGroup: [
        { type: 'table', tooltip: 'Table', svg: svg.table },
        { type: 'blockquote', tooltip: 'Block Quote', svg: svg.quote },
        { type: 'pre', tooltip: 'Code Block', shortcut: `⇧+${CK}+K`, svg: svg.codeBlock },
        { type: 'mathblock', tooltip: 'Math Block', svg: svg.mathBlock },
        { type: 'html', tooltip: 'HTML Block', svg: svg.html }
      ],
      miscGroup: [
        { type: 'hr', event: 'paragraph', tooltip: 'Horizontal Rule', svg: svg.hr },
        { type: 'front-matter', event: 'paragraph', tooltip: 'Front Matter', svg: svg.frontMatter },
        { type: 'clear', event: 'format', tooltip: 'Clear Formatting', shortcut: `⇧+${CK}+R`, svg: svg.clearFormat }
      ]
    }
  },
  computed: {
    ...mapState({
      selectionFormats: state => state.editor.selectionFormats
    })
  },
  mounted () {
    document.addEventListener('click', this.closeHeadingMenu)
  },
  beforeDestroy () {
    document.removeEventListener('click', this.closeHeadingMenu)
  },
  methods: {
    isActive (type) {
      return this.selectionFormats.some(f => f.type === type)
    },
    handleFormat (type) {
      bus.$emit('format', type)
    },
    handleParagraph (type) {
      bus.$emit('paragraph', type)
      this.headingMenuOpen = false
    },
    toggleHeadingMenu () {
      this.headingMenuOpen = !this.headingMenuOpen
    },
    closeHeadingMenu (e) {
      if (this.$refs.headingDropdown && !this.$refs.headingDropdown.contains(e.target)) {
        this.headingMenuOpen = false
      }
    },
    selectHeading (h) {
      bus.$emit('paragraph', h.type)
      this.headingMenuOpen = false
    }
  }
}
</script>

<style scoped>
  .format-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 38px;
    padding: 0 16px;
    background: var(--floatBgColor);
    border-bottom: 1px solid var(--editorColor10);
    flex-shrink: 0;
    user-select: none;
    overflow: visible;
    position: relative;
    z-index: 10;
  }
  .format-bar-inner {
    display: flex;
    align-items: center;
    gap: 1px;
  }
  .separator {
    width: 1px;
    height: 18px;
    margin: 0 8px;
    background: var(--editorColor10);
    flex-shrink: 0;
  }
  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    color: var(--iconColor);
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }
  .format-btn:hover {
    color: var(--editorColor);
    background: var(--editorColor10);
  }
  .format-btn.active {
    color: var(--themeColor);
    background: var(--themeColor10);
  }

  /* Heading dropdown */
  .heading-dropdown {
    position: relative;
  }
  .heading-trigger {
    width: 42px;
    gap: 2px;
  }
  .dropdown-arrow {
    opacity: 0.5;
    margin-left: 1px;
  }
  .heading-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 6px;
    padding: 4px;
    min-width: 170px;
    background: var(--floatBgColor);
    border: 1px solid var(--editorColor10);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }
  .heading-option {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    color: var(--editorColor);
    text-align: left;
    font-family: inherit;
    white-space: nowrap;
  }
  .heading-option:hover {
    background: var(--editorColor10);
  }
  .heading-menu-divider {
    height: 1px;
    margin: 4px 6px;
    background: var(--editorColor10);
  }
</style>
