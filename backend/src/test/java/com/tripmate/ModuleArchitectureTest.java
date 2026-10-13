package com.tripmate;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;

class ModuleArchitectureTest {
    @Test
    void featureModulesUsePublicFacadesAndHaveNoDependencyCycles() throws Exception {
        Path root = Path.of("src/main/java/com/tripmate");
        var references = Pattern.compile("com\\.tripmate\\.([a-z]+)\\.([a-z]+)\\.");
        Map<String, Set<String>> graph = new HashMap<>();
        try (var paths = Files.walk(root)) {
            for (Path source : paths.filter(p -> p.toString().endsWith(".java")).toList()) {
                var relative = root.relativize(source);
                if (relative.getNameCount() < 2) continue;
                String owner = relative.getName(0).toString();
                var matcher = references.matcher(Files.readString(source));
                while (matcher.find()) {
                    String target = matcher.group(1);
                    if (owner.equals(target) || target.equals("shared")) continue;
                    assertEquals("api", matcher.group(2), source + " imports feature internals");
                    graph.computeIfAbsent(owner, ignored -> new HashSet<>()).add(target);
                }
            }
        }
        for (String module : graph.keySet()) visit(module, graph, new HashSet<>(), new HashSet<>());
    }

    private void visit(
            String module,
            Map<String, Set<String>> graph,
            Set<String> visiting,
            Set<String> visited) {
        if (visited.contains(module)) return;
        assertTrue(visiting.add(module), "Module dependency cycle at " + module);
        for (String target : graph.getOrDefault(module, Set.of()))
            visit(target, graph, visiting, visited);
        visiting.remove(module);
        visited.add(module);
    }
}
