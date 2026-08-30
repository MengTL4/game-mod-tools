  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function commandQueueId(command, line) {
    if (!command || typeof command !== "object") return "";
    if (command.__codexQueueId) return String(command.__codexQueueId);
    if (command.commandId || command._commandId || command.cid) {
      return String(command.commandId || command._commandId || command.cid);
    }
    if (typeof command.id === "string" && /^\d+-[a-f0-9]+$/i.test(command.id)) return command.id;
    return `legacy-${hashString(line || JSON.stringify(command))}`;
  }
