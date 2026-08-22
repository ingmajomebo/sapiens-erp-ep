# syntax=docker/dockerfile:1

# ---------- Etapa de build ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

# Wrapper y descriptores primero: si no cambian, Docker reusa la capa de dependencias
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ---------- Etapa de runtime ----------
FROM eclipse-temurin:21-jre
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -r -u 1001 -m sapiens

WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar
RUN mkdir -p /app/uploads/qa /app/uploads/products && chown -R sapiens:sapiens /app

USER sapiens
EXPOSE 8080

# MaxRAMPercentage deja que la JVM respete el límite del contenedor
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
