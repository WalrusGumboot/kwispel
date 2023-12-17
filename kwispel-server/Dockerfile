# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app/server-dir

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY kwispel-server/package.json kwispel-server/bun.lockb /temp/dev/
COPY kwispel-client /usr/src/app/kwispel-client
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY kwispel-server/package.json kwispel-server/bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY kwispel-server .

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/server-dir/main.ts .
COPY --from=prerelease /usr/src/app/server-dir/package.json .
RUN mkdir -p /usr/src/app/kwispel-client
COPY kwispel-client /usr/src/app/kwispel-client

# run the app
USER bun
EXPOSE 3141/tcp
# EXPOSE 5173/tcp
ENTRYPOINT [ "bun", "main.ts" ]
