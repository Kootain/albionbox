export const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KOOK Consumer Manager</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #f4f4f9; color: #333; margin: 0; padding: 20px; }
    h1, h2 { color: #222; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .section { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #f9f9f9; }
    button { padding: 8px 12px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer; }
    button:hover { background: #0056b3; }
    button.delete-btn { background: #dc3545; }
    button.delete-btn:hover { background: #c82333; }
    form { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: span 2; }
    label { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
    select, input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    .error { color: #dc3545; font-size: 14px; margin-top: 10px; }
    .loading { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <h1>KOOK Consumer Worker Management</h1>

    <div class="section">
      <h2>Add New Filter Rule</h2>
      <form id="add-filter-form">
        <div class="form-group">
          <label for="consumer-select">Consumer Instance</label>
          <select id="consumer-select" required>
            <option value="">Loading...</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="guild-select">Guild (Server)</label>
          <select id="guild-select">
            <option value="">-- Any --</option>
          </select>
        </div>

        <div class="form-group">
          <label for="channel-select">Channel</label>
          <select id="channel-select" disabled>
            <option value="">-- Any --</option>
          </select>
        </div>

        <div class="form-group">
          <label for="role-select">Required Role</label>
          <select id="role-select" disabled>
            <option value="">-- Any --</option>
          </select>
        </div>

        <div class="form-group">
          <label for="msg-type-select">Message Type</label>
          <select id="msg-type-select">
            <option value="">-- Any --</option>
            <option value="1">Text (1)</option>
            <option value="2">Image (2)</option>
            <option value="3">Video (3)</option>
            <option value="4">File (4)</option>
            <option value="8">Audio (8)</option>
            <option value="9">KMarkdown (9)</option>
            <option value="10">Card (10)</option>
            <option value="255">System (255)</option>
          </select>
        </div>

        <div class="form-group full-width">
          <button type="submit">Add Filter Rule</button>
          <div id="form-error" class="error"></div>
        </div>
      </form>
    </div>

    <div class="section">
      <h2>Current Filters</h2>
      <div id="filters-loading" class="loading">Loading filters...</div>
      <table id="filters-table" style="display: none;">
        <thead>
          <tr>
            <th>ID</th>
            <th>Consumer</th>
            <th>Guild</th>
            <th>Channel</th>
            <th>Msg Type</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <!-- Rows will be added here -->
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // State
    let state = {
      consumers: [],
      guilds: [],
      channels: [],
      channelsByGuildId: {},
      channelsLoadingByGuildId: {},
      roles: [],
      filters: []
    };

    // DOM Elements
    const elements = {
      consumerSelect: document.getElementById('consumer-select'),
      guildSelect: document.getElementById('guild-select'),
      channelSelect: document.getElementById('channel-select'),
      roleSelect: document.getElementById('role-select'),
      msgTypeSelect: document.getElementById('msg-type-select'),
      addFilterForm: document.getElementById('add-filter-form'),
      formError: document.getElementById('form-error'),
      filtersTable: document.getElementById('filters-table'),
      filtersTbody: document.querySelector('#filters-table tbody'),
      filtersLoading: document.getElementById('filters-loading')
    };

    // API calls
    const api = {
      async getConsumers() {
        const res = await fetch('/api/consumers');
        return res.json();
      },
      async getGuilds() {
        const res = await fetch('/api/kook/guilds');
        const data = await res.json();
        return data.items || [];
      },
      async getChannels(guildId) {
        const res = await fetch(\`/api/kook/channels?guild_id=\${guildId}\`);
        const data = await res.json();
        return data.items || [];
      },
      async getRoles(guildId) {
        const res = await fetch(\`/api/kook/roles?guild_id=\${guildId}\`);
        const data = await res.json();
        return data.items || [];
      },
      async getFilters() {
        const res = await fetch('/api/filters');
        return res.json();
      },
      async createFilter(filter) {
        const res = await fetch('/api/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filter)
        });
        if (!res.ok) throw new Error('Failed to create filter');
        return res.json();
      },
      async deleteFilter(id) {
        const res = await fetch(\`/api/filters/\${id}\`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete filter');
        return res.json();
      }
    };

    // Initial load
    async function init() {
      try {
        const [consumers, guilds, filters] = await Promise.all([
          api.getConsumers(),
          api.getGuilds(),
          api.getFilters()
        ]);
        
        state.consumers = consumers;
        state.guilds = guilds;
        state.filters = filters;

        renderConsumers();
        renderGuilds();
        await prefetchFilterChannels();
        renderFilters();
      } catch (e) {
        console.error('Initialization error:', e);
        elements.formError.textContent = 'Failed to load initial data. Ensure KOOK_BOT_TOKEN is valid.';
      }
    }

    async function ensureChannelsLoaded(guildId) {
      if (!guildId) return;
      if (state.channelsByGuildId[guildId]) return;
      if (state.channelsLoadingByGuildId[guildId]) return state.channelsLoadingByGuildId[guildId];

      state.channelsLoadingByGuildId[guildId] = api.getChannels(guildId)
        .then((channels) => {
          state.channelsByGuildId[guildId] = channels;
          delete state.channelsLoadingByGuildId[guildId];
        })
        .catch((err) => {
          console.error('Failed to load channels for guild:', guildId, err);
          delete state.channelsLoadingByGuildId[guildId];
        });

      return state.channelsLoadingByGuildId[guildId];
    }

    async function prefetchFilterChannels() {
      const guildIds = [...new Set(
        state.filters
          .filter(f => f.guild_id && f.channel_id)
          .map(f => f.guild_id)
      )];
      await Promise.all(guildIds.map((guildId) => ensureChannelsLoaded(guildId)));
    }

    // Event Listeners
    elements.guildSelect.addEventListener('change', async (e) => {
      const guildId = e.target.value;
      if (!guildId) {
        elements.channelSelect.innerHTML = '<option value="">-- Any --</option>';
        elements.channelSelect.disabled = true;
        elements.roleSelect.innerHTML = '<option value="">-- Any --</option>';
        elements.roleSelect.disabled = true;
        return;
      }

      elements.channelSelect.innerHTML = '<option value="">Loading...</option>';
      elements.roleSelect.innerHTML = '<option value="">Loading...</option>';
      
      try {
        const [channels, roles] = await Promise.all([
          api.getChannels(guildId),
          api.getRoles(guildId)
        ]);
        
        state.channels = channels;
        state.channelsByGuildId[guildId] = channels;
        state.roles = roles;
        
        renderChannels();
        renderRoles();
      } catch (err) {
        console.error('Failed to load guild details:', err);
      }
    });

    elements.addFilterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      elements.formError.textContent = '';
      
      const filter = {
        consumer_id: elements.consumerSelect.value
      };

      if (elements.guildSelect.value) filter.guild_id = elements.guildSelect.value;
      if (elements.channelSelect.value) filter.channel_id = elements.channelSelect.value;
      if (elements.msgTypeSelect.value) filter.msg_type = parseInt(elements.msgTypeSelect.value, 10);
      
      const roleVal = elements.roleSelect.value;
      if (roleVal) {
        // KOOK roles can be numeric string or number. Let's send as string/number.
        filter.role_id = isNaN(Number(roleVal)) ? roleVal : Number(roleVal);
      }

      try {
        const newFilter = await api.createFilter(filter);
        state.filters.push(newFilter);
        renderFilters();
        elements.addFilterForm.reset();
        elements.channelSelect.innerHTML = '<option value="">-- Any --</option>';
        elements.channelSelect.disabled = true;
        elements.roleSelect.innerHTML = '<option value="">-- Any --</option>';
        elements.roleSelect.disabled = true;
      } catch (err) {
        elements.formError.textContent = err.message;
      }
    });

    // Render functions
    function renderConsumers() {
      if (state.consumers.length === 0) {
        elements.consumerSelect.innerHTML = '<option value="">No consumers found</option>';
        return;
      }
      elements.consumerSelect.innerHTML = state.consumers.map(c => 
        \`<option value="\${c}">\${c}</option>\`
      ).join('');
    }

    function renderGuilds() {
      elements.guildSelect.innerHTML = '<option value="">-- Any --</option>' + 
        state.guilds.map(g => \`<option value="\${g.id}">\${g.name}</option>\`).join('');
    }

    function renderChannels() {
      elements.channelSelect.disabled = false;
      elements.channelSelect.innerHTML = '<option value="">-- Any --</option>' + 
        state.channels.map(c => \`<option value="\${c.id}">\${c.name}</option>\`).join('');
    }

    function renderRoles() {
      elements.roleSelect.disabled = false;
      elements.roleSelect.innerHTML = '<option value="">-- Any --</option>' + 
        state.roles.map(r => \`<option value="\${r.role_id}">\${r.name}</option>\`).join('');
    }

    function getGuildName(id) {
      if (!id) return '-';
      const g = state.guilds.find(g => g.id === id);
      return g ? g.name : id;
    }

    function getChannelName(guildId, channelId) {
      if (!channelId) return '-';
      if (!guildId) return channelId;
      const channels = state.channelsByGuildId[guildId];
      if (!channels) return channelId;
      const c = channels.find(c => c.id === channelId);
      return c ? c.name : channelId;
    }

    function renderFilters() {
      elements.filtersLoading.style.display = 'none';
      elements.filtersTable.style.display = 'table';
      
      if (state.filters.length === 0) {
        elements.filtersTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No filters configured.</td></tr>';
        return;
      }

      elements.filtersTbody.innerHTML = state.filters.map(f => \`
        <tr>
          <td><small>\${f.id.substring(0, 8)}...</small></td>
          <td>\${f.consumer_id}</td>
          <td>\${getGuildName(f.guild_id)}</td>
          <td>\${getChannelName(f.guild_id, f.channel_id)}</td>
          <td>\${f.msg_type || '-'}</td>
          <td>\${f.role_id || '-'}</td>
          <td>
            <button class="delete-btn" onclick="deleteFilter('\${f.id}')">Delete</button>
          </td>
        </tr>
      \`).join('');
    }

    window.deleteFilter = async function(id) {
      if (!confirm('Are you sure you want to delete this filter?')) return;
      try {
        await api.deleteFilter(id);
        state.filters = state.filters.filter(f => f.id !== id);
        renderFilters();
      } catch (err) {
        alert('Failed to delete filter: ' + err.message);
      }
    };

    // Start
    init();
  </script>
</body>
</html>`;
