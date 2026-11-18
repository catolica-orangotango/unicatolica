# Imagem de produção do backend (Render Web Service, AD-6). Contexto: backend/
# Estágio 1: build com JDK 21. Estágio 2: só o JRE 21 e o quarkus-app.
# Maven da imagem oficial, sem o mvnw: no Linux o wrapper baixa o .tar.gz e o
# distributionSha256Sum do repositório é do .zip, então a validação falha num build limpo.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY src src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 pacext
COPY --from=build --chown=pacext /build/target/quarkus-app/ ./
USER pacext
# O Render injeta PORT (quarkus.http.port=${PORT:8080}). Plano gratuito: 512 MB no total.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=65 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
CMD ["sh", "-c", "exec java $JAVA_OPTS -jar quarkus-run.jar"]
