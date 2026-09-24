package com.tripmate.shared.persistence;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Runs schema migrations before Hibernate validates the application schema.
 *
 * <p>Spring Boot 4 no longer contributes Flyway auto-configuration from the
 * core auto-configuration module, so the application wires the small amount
 * of required lifecycle behavior explicitly.</p>
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "spring.flyway.enabled", havingValue = "true", matchIfMissing = true)
public class FlywayMigrationConfiguration {

    @Bean
    Flyway flyway(DataSource dataSource, Environment environment) {
        String locations = environment.getProperty(
                "spring.flyway.locations", "classpath:db/migration");
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations(locations.split(","))
                .load();
        flyway.migrate();
        return flyway;
    }

    @Bean
    static BeanFactoryPostProcessor entityManagerFactoryDependsOnFlyway() {
        return beanFactory -> {
            if (!(beanFactory instanceof ConfigurableListableBeanFactory configurableFactory)
                    || !configurableFactory.containsBeanDefinition("entityManagerFactory")) {
                return;
            }
            BeanDefinition entityManagerFactory = configurableFactory
                    .getBeanDefinition("entityManagerFactory");
            String[] existingDependencies = entityManagerFactory.getDependsOn();
            if (existingDependencies == null || existingDependencies.length == 0) {
                entityManagerFactory.setDependsOn("flyway");
                return;
            }
            for (String dependency : existingDependencies) {
                if ("flyway".equals(dependency)) {
                    return;
                }
            }
            String[] dependencies = new String[existingDependencies.length + 1];
            System.arraycopy(existingDependencies, 0, dependencies, 0, existingDependencies.length);
            dependencies[existingDependencies.length] = "flyway";
            entityManagerFactory.setDependsOn(dependencies);
        };
    }
}
