# Docker Containers

## Introduction

Docker is a tool that helps automate application deployment. They are not resource heavy, so applications 
can work in efficiently in different environments. They are isolated from each other, but can still 
communicate with each other through defined channels. Dockers share the services of a single os kernel.
I chose this topic because I hear about docker a lot, but it is still an abstract concept to me.
I'm familiar with virtual machines, but don't have a great grasp of what docker containers are and 
how they function.

## History of Docker

While Docker is the most well-known service for containerization, they were not the first to invent it. 
Docker adapted an existing technology, LXC. LXC (linux containers) came partially from the introduction 
of cgroups. Cgroups are a kernel feature in linux that allows admins to allocate, limit, and manage system
resources for process groups. Both LXC and Docker utilize kernel features like cgroups and namespaces to 
isolate processes. Docker just managed to make containerization more user-friendly.

LXC vs Docker
> LXC started as a system-level containerization technology. Their goal was to provide lighweight virtualization
> by isolating processes and resources at the os level. It allows one to create environments that resemble full
> Linux systems. These environments include tty terminals, user permission stack, their own file systems, etc.
>
> Docker was inititally built on top of LXC. However, their focus was on application containerization, and
> simplifying the packaging and deployment. They created user-friendly tools and made containerization more
> accessible. Eventually, they developed their own containerization engine to replace LXC. With this they
> could provide a more controlled and application-centric environment, running a single virtualized application
> engine per container, rather than a full guest OS.

### Before Containers
To make an application public, you'd need to do the following:
1. Buy a server.
2. Install applications and dependencies.
3. Configure the environment.
4. Deploy your application.
5. Make the server public.

This process came with a host of problems. You were responsible for every dependency and configuration, bug fix,
and provisioning. As each app needed a unique environment, you would typically need a new server for each app.
Things improved with virtual machines, but they are resource heavy and slow. When containers came into the picture,
everything changed. 
Containers only include:
* the app
* its dependencies
* configuration files
* environment variables
* any other necessary data

Since containers are designed to be flexible and minimal, they only require the bare-bones. They share the
host OS kernel, which saves a lot of resources.

### Container Standardization
Docker started out as dotCloud, a Paas (Platform as a Service) company. While they weren't very successful
there, their Docker tool that they had developed became their new focus. In 2013 they made Docker their main product. They wanted a robust, multiplatform application for building, deploying, and managing containers.They got together with Google and the Linux Foundation to start the Open Container Initiative (OCI). Together, they defined the following standards for containers:
* Image Specification - how container images (container blueprints) are created
* Runtime Specification - how containers are executed and managed throughout their lifecycle
* Distribution Specification - how container images are shared and distributed

With these standards in place, containers became a lot more useful to developers.


## How do Docker Containers work?
Docker uses a client-server architecture, and consists of three main components:
1. Software: the Docker daemon, dockerd
2. Objects: entities used to assemble applications, of which there are three main classes:
     * container: a standardized encapsulated environment that runs applications
     * image: a read-only template used to build containers, used to store and ship applications
     * service: allows containers to be scaled across multiple Docker daemons
3. Registries: a repository for Docker images. Docker clients connect to registries to download or upload images for use.

The Docker Client, a command-line interface, is used to interact with the Docker daemon.

To build a docker container:
1. Define the application environment: Create a Dockerfile that specifies the base image, copies your application code, installs dependencies, and defines the command to run your application. This also specifies the Linux distribution that will run on the container.

An example Dockerfile from Wikipedia:
```
ARG CODE_VERSION=latest
FROM ubuntu:${CODE_VERSION}
COPY ./examplefile.txt /examplefile.txt
ENV MY_ENV_VARIABLE="example_value"
RUN apt-get update

# Mount a directory from the Docker volume
# Note: This is usually specified in the 'docker run' command.
VOLUME ["/myvolume"]

# Expose a port (22 for SSH)
EXPOSE 22
```

2. Build the image: Use the Docker client to execute docker build ,

### Overview

## Docker Containers vs Virtual Machines

## Conclusion
